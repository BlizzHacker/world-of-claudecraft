using System;
using System.IO;
using Microsoft.Web.WebView2.Core;
using Windows.ApplicationModel;
using Windows.Security.ExchangeActiveSyncProvisioning;
using Windows.System;
using Windows.UI.Core;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace CrypticRealm.Shell
{
    /// <summary>
    /// Hosts Cryptic Realm on console, from content shipped INSIDE the package.
    ///
    /// The client is a WebGL2 three.js app, which rules out the obvious
    /// packaging route: a hosted web app (an MSIX whose Application element is
    /// a StartPage URL) runs on the legacy EdgeHTML engine on Xbox, and
    /// EdgeHTML has no WebGL2. three.js dropped WebGL1 in r163 and this client
    /// is on r165, so that package installs, launches and renders nothing. A
    /// WinUI 2 UWP hosting WebView2 gets the Chromium engine instead.
    ///
    /// The whole client is packaged rather than loaded from crypticrealm.com,
    /// so the app boots instantly, works with no network at all, and does not
    /// depend on any server of ours staying up. Online play still works when
    /// there is a connection: the client's own net layer reaches the realm
    /// servers, whose CORS allowlist carries this origin.
    ///
    /// WebView2 cannot get controller input for itself on UWP (the Gamepad API
    /// does not reach its content, MicrosoftEdge/WebView2Feedback#4366), so
    /// <see cref="GamepadBridge"/> reads Windows.Gaming.Input natively and
    /// Assets/gamepad-polyfill.js republishes it through
    /// navigator.getGamepads(). The web client runs UNMODIFIED.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        /// <summary>Virtual host for the packaged client. https keeps it a secure
        /// context (storage, WebGL and the rest behave), and it cannot collide
        /// with any public origin.</summary>
        private const string VirtualHost = "app.local";

        private readonly GamepadBridge _pads = new GamepadBridge();

        public MainPage()
        {
            InitializeComponent();
            Loaded += OnLoaded;

            // On Xbox the chain is KeyDown/KeyUp -> if unhandled,
            // BackRequested -> if unhandled, the shell closes the app. Handling
            // only BackRequested was not enough on real hardware, so B is
            // claimed at the earliest stage as well.
            // Guarded: another legacy view API, and losing the extra B-claim is
            // survivable where dying at the splash is not.
            try { SystemNavigationManager.GetForCurrentView().BackRequested += (s, e) => e.Handled = true; }
            catch (Exception) { }

            var win = Window.Current.CoreWindow;
            win.KeyDown += Swallow;
            win.KeyUp += Swallow;
            win.Dispatcher.AcceleratorKeyActivated += (s, e) =>
            {
                if (IsClaimed(e.VirtualKey)) e.Handled = true;
            };

            _pads.ExitRequested += OnExitRequested;
        }

        /* Claimed before anything else sees them.
         *
         * B: unclaimed it is the console back gesture and tears the app down.
         * Cryptic Realm uses B in combat, so it must reach the page instead,
         * which it does via GamepadBridge reading Windows.Gaming.Input
         * directly. Claiming the KEY does not hide the BUTTON.
         *
         * Menu and View: WebView2 on Xbox offers to switch out of gamepad mode
         * into a mouse cursor when these are pressed, and this app has no
         * cursor UI to switch back with. */
        private static readonly VirtualKey[] ClaimedKeys =
        {
            VirtualKey.GamepadB,
            VirtualKey.GamepadMenu,
            VirtualKey.GamepadView,
        };

        private static bool IsClaimed(VirtualKey key)
        {
            foreach (var k in ClaimedKeys)
            {
                if (k == key) return true;
            }
            return false;
        }

        private static void Swallow(CoreWindow sender, KeyEventArgs e)
        {
            if (IsClaimed(e.VirtualKey)) e.Handled = true;
        }

        /// <summary>Console model, e.g. "Xbox One X" or "Xbox Series X". The web
        /// layer cannot tell the generations apart (identical user agent), and
        /// they need very different graphics budgets.</summary>
        private static string ConsoleModel()
        {
            try
            {
                return new EasClientDeviceInformation().SystemProductName ?? string.Empty;
            }
            catch (Exception)
            {
                // Never let a diagnostic lookup stop the app starting; the web
                // layer falls back to the cautious budget without this.
                return string.Empty;
            }
        }

        private async void OnLoaded(object sender, RoutedEventArgs e)
        {
            // Chrome DevTools over the Device Portal: the only way to profile a
            // console (the Xbox Edge browser has no DevTools). On in Debug, and
            // in Release only when an operator drops a LocalState marker on a dev
            // console. A shipped Store package never has the marker. Must be set
            // before the CoreWebView2 is created.
            var debugOn = false;
#if DEBUG
            debugOn = true;
#endif
            try
            {
                if (System.IO.File.Exists(System.IO.Path.Combine(
                        Windows.Storage.ApplicationData.Current.LocalFolder.Path,
                        "crypticrealm-devtools")))
                    debugOn = true;
            }
            catch (Exception) { }
            if (debugOn)
            {
                Environment.SetEnvironmentVariable(
                    "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
                    "--enable-features=msEdgeDevToolsWdpRemoteDebugging");
            }
            try
            {
                await Web.EnsureCoreWebView2Async();
            }
            catch (Exception ex)
            {
                Fail("The web runtime could not start on this console.\n\n" + ex.Message);
                return;
            }

            var core = Web.CoreWebView2;
            core.Settings.AreDefaultContextMenusEnabled = false;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.IsZoomControlEnabled = false;
            core.Settings.AreBrowserAcceleratorKeysEnabled = false;

            // Serve the packaged client from a real https origin.
            var webRoot = Path.Combine(Package.Current.InstalledLocation.Path, "web");
            if (!Directory.Exists(webRoot))
            {
                Fail("This package shipped without its game content.");
                return;
            }
            core.SetVirtualHostNameToFolderMapping(
                VirtualHost, webRoot, CoreWebView2HostResourceAccessKind.Allow);

            try
            {
                // Both land at document-create, before any game script runs: the
                // polyfill must beat the page to navigator.getGamepads, and the
                // model stamp must exist before the graphics tier is resolved.
                var polyfill = await ReadAssetAsync("Assets/gamepad-polyfill.js");
                await core.AddScriptToExecuteOnDocumentCreatedAsync(polyfill);

                var model = ConsoleModel().Replace("\\", string.Empty).Replace("'", string.Empty);
                await core.AddScriptToExecuteOnDocumentCreatedAsync(
                    "document.documentElement.dataset.console = '" + model + "';");
            }
            catch (Exception ex)
            {
                // Without the polyfill the game ignores the controller entirely,
                // which is worse than refusing to start.
                Fail("Controller support failed to install.\n\n" + ex.Message);
                return;
            }

            // Two navigation guards for console reality. The WebView2 maps a
            // controller gesture to history back and forward, which reloads the
            // page under the player and looks like being logged out; nothing in
            // this app navigates through history on purpose, so those are
            // cancelled outright. Top-level navigation is otherwise allowed ONLY
            // to the app's own surfaces: the packaged origin (app.local) and the
            // game's own site and realm subdomains (crypticrealm.com,
            // <realm>.crypticrealm.com). Entering a realm navigates the page to
            // https://crypticrealm.com/#auth_token=...&realm=... on purpose, so
            // that must pass; only genuinely external destinations (OAuth
            // providers, community links) are cancelled, since those would
            // strand the player in a webview with no browser chrome to return.
            core.NavigationStarting += (s, a) =>
            {
                if (a.NavigationKind == CoreWebView2NavigationKind.BackOrForward)
                {
                    a.Cancel = true;
                    return;
                }
                try
                {
                    var host = new Uri(a.Uri).Host;
                    var allowed =
                        host.Equals(VirtualHost, StringComparison.OrdinalIgnoreCase) ||
                        host.Equals("crypticrealm.com", StringComparison.OrdinalIgnoreCase) ||
                        host.EndsWith(".crypticrealm.com", StringComparison.OrdinalIgnoreCase);
                    if (!allowed) a.Cancel = true;
                }
                catch (Exception)
                {
                    a.Cancel = true;
                }
            };

            core.NavigationCompleted += (s, a) =>
            {
                if (a.IsSuccess)
                {
                    Status.Visibility = Visibility.Collapsed;
                    _pads.Start(core);
                }
                else
                {
                    _pads.Stop();
                    Fail("The packaged client failed to load (" + a.WebErrorStatus + ").");
                }
            };
            core.ProcessFailed += (s, a) =>
            {
                _pads.Stop();
                Fail("The web runtime stopped (" + a.ProcessFailedKind + "). Reopen Cryptic Realm.");
            };

            Web.Source = new Uri("https://" + VirtualHost + "/index.html");
            Web.Focus(FocusState.Programmatic);
        }

        private static async System.Threading.Tasks.Task<string> ReadAssetAsync(string relative)
        {
            var uri = new Uri("ms-appx:///" + relative);
            var file = await Windows.Storage.StorageFile.GetFileFromApplicationUriAsync(uri);
            return await Windows.Storage.FileIO.ReadTextAsync(file);
        }

        private void Fail(string message)
        {
            Status.Visibility = Visibility.Visible;
            Status.Text = message;
        }

        private void OnExitRequested(object sender, EventArgs e)
        {
            // B is claimed and in-game, so it cannot be the way out. View+Menu
            // held together is deliberate enough never to be hit by accident.
            _pads.Stop();
            Application.Current.Exit();
        }
    }
}

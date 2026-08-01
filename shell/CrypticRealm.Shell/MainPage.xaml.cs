using System;
using Microsoft.Web.WebView2.Core;
using Windows.System;
using Windows.UI.Core;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace CrypticRealm.Shell
{
    /// <summary>
    /// Hosts Cryptic Realm on console.
    ///
    /// The game is a WebGL2 three.js client, which rules out the obvious
    /// packaging route: a hosted web app (an MSIX whose Application element is a
    /// StartPage URL) runs on the legacy EdgeHTML engine on Xbox, and EdgeHTML
    /// has no WebGL2 at all. three.js dropped WebGL1 in r163 and this client is
    /// on r165, so that package installs, launches, and renders nothing. A
    /// WinUI 2 UWP hosting WebView2 gets the Chromium engine instead.
    ///
    /// The one thing WebView2 cannot do for itself is controller input: the
    /// Gamepad API does not reach its content on UWP
    /// (MicrosoftEdge/WebView2Feedback#4366). <see cref="GamepadBridge"/> reads
    /// Windows.Gaming.Input natively and Assets/gamepad-polyfill.js republishes
    /// it through navigator.getGamepads(), so the web client runs UNMODIFIED --
    /// nothing in the game knows it is on a console.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        // Overridable so a tester can point the shell at a stage ring without a
        // rebuild; falls back to the live realm hub.
        private const string DefaultUrl = "https://crypticrealm.com/";

        private readonly GamepadBridge _pads = new GamepadBridge();

        public MainPage()
        {
            InitializeComponent();
            Loaded += OnLoaded;

            // On Xbox the chain is KeyDown/KeyUp -> if unhandled,
            // BackRequested -> if unhandled, the shell closes the app. Handling
            // only BackRequested was not enough on real hardware, so B is
            // claimed at the earliest stage as well.
            SystemNavigationManager.GetForCurrentView().BackRequested += (s, e) => e.Handled = true;

            var win = Window.Current.CoreWindow;
            win.KeyDown += Swallow;
            win.KeyUp += Swallow;
            // Fires even when focus is inside the WebView2, which does not route
            // gamepad input through XAML at all.
            win.Dispatcher.AcceleratorKeyActivated += (s, e) =>
            {
                if (IsClaimed(e.VirtualKey)) e.Handled = true;
            };

            _pads.ExitRequested += OnExitRequested;
        }

        /* Claimed before anything else sees them.
         *
         * B: unclaimed it is the console back gesture and tears the app down.
         * Cryptic Realm uses B in combat, so it must reach the page instead --
         * which it does, via GamepadBridge reading Windows.Gaming.Input
         * directly. Claiming the KEY does not hide the BUTTON.
         *
         * Menu and View: WebView2 on Xbox offers to switch out of gamepad mode
         * into a mouse cursor when these are pressed, and this app has no cursor
         * UI to switch back with -- a tester who accepted it was stranded. */
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

        private async void OnLoaded(object sender, RoutedEventArgs e)
        {
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

            // At document-create, so it lands before any game script can capture
            // the real (dead) navigator.getGamepads.
            try
            {
                var polyfill = await ReadAssetAsync("Assets/gamepad-polyfill.js");
                await core.AddScriptToExecuteOnDocumentCreatedAsync(polyfill);
            }
            catch (Exception ex)
            {
                // Without this the game is unplayable -- say so rather than
                // presenting a running game that ignores the controller.
                Fail("Controller support failed to install.\n\n" + ex.Message);
                return;
            }

            core.NavigationCompleted += (s, a) =>
            {
                if (a.IsSuccess)
                {
                    Status.Visibility = Visibility.Collapsed;
                    // Only pump input once something is actually loaded.
                    _pads.Start(core);
                }
                else
                {
                    _pads.Stop();
                    Fail("Cryptic Realm could not be reached (" + a.WebErrorStatus + ").\n\n"
                       + "Check the console's network connection, then reopen the app.");
                }
            };
            core.ProcessFailed += (s, a) =>
            {
                _pads.Stop();
                Fail("The web runtime stopped (" + a.ProcessFailedKind + "). Reopen Cryptic Realm.");
            };

            Web.Source = new Uri(DefaultUrl);
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
            // B is claimed and in-game, so it cannot be the way out. The Guide
            // button always works, but a tester should not have to know that:
            // View+Menu held together is deliberate enough never to be hit by
            // accident and is documented on the download page.
            _pads.Stop();
            Application.Current.Exit();
        }
    }
}

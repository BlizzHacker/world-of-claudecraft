using System;
using Windows.ApplicationModel;
using Windows.ApplicationModel.Activation;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace CrypticRealm.Probe
{
    /// <summary>
    /// Host application. Its only job is to put a WebView2 on screen full-bleed
    /// and hand the console's controller to the web app inside it.
    ///
    /// Instrumented: every activation step appends a marker to
    /// LocalState\probe-marks.log, which the Xbox Device Portal file API can
    /// read back off the console. The crash dumps only say that SOMETHING in
    /// activation raised NotSupportedException through combase; the last marker
    /// written before the process dies names the exact call, and the
    /// UnhandledException hook captures the full exception chain including the
    /// pieces WER never records.
    /// </summary>
    public sealed partial class App : Application
    {
        internal static void Mark(string s)
        {
            try
            {
                var f = System.IO.Path.Combine(
                    Windows.Storage.ApplicationData.Current.LocalFolder.Path,
                    "probe-marks.log");
                System.IO.File.AppendAllText(
                    f, DateTime.UtcNow.ToString("HH:mm:ss.fff") + " " + s + "\r\n");
            }
            catch (Exception)
            {
                // A diagnostic must never be the thing that kills the app.
            }
        }

        public App()
        {
            Mark("app-ctor-enter");
            UnhandledException += (s, e) =>
            {
                var ex = e.Exception;
                var text = "UNHANDLED msg=" + e.Message;
                for (var i = 0; ex != null && i < 5; i++)
                {
                    text += " | [" + i + "] " + ex.GetType().FullName + ": " + ex.Message
                          + "\r\n" + ex.StackTrace;
                    ex = ex.InnerException;
                }
                Mark(text);
            };
            Mark("unhandled-hooked");
            InitializeComponent();
            Mark("initializecomponent-done");
            Suspending += OnSuspending;
            Mark("app-ctor-done");
        }

        protected override void OnLaunched(LaunchActivatedEventArgs e)
        {
            Mark("onlaunched-enter");
            try
            {
                // On Xbox, UWP defaults to a 4:3-safe scaled view and shows a mouse
                // cursor. Neither is wanted, but these are cosmetic tweaks and the
                // console OS retires the legacy view APIs over time: the June 2026
                // System OS fails the RequiresPointerMode setter with
                // E_NOTSUPPORTED. Each tweak may fail on its own; the marker log
                // records which ones this OS still supports.
                try { ApplicationViewScaling.TrySetDisableLayoutScaling(true); Mark("scaling-done"); }
                catch (Exception ex) { Mark("scaling-FAILED " + ex.GetType().Name + ": " + ex.Message); }
                try { RequiresPointerMode = ApplicationRequiresPointerMode.WhenRequested; Mark("pointermode-done"); }
                catch (Exception ex) { Mark("pointermode-FAILED " + ex.GetType().Name + ": " + ex.Message); }

                var root = Window.Current.Content as Frame;
                Mark("window-content-read");
                if (root == null)
                {
                    root = new Frame();
                    Mark("frame-created");
                    Window.Current.Content = root;
                    Mark("window-content-set");
                }

                if (root.Content == null)
                {
                    root.Navigate(typeof(MainPage), e.Arguments);
                    Mark("navigate-done");
                }

                try
                {
                    ApplicationView.GetForCurrentView()
                        .SetDesiredBoundsMode(ApplicationViewBoundsMode.UseCoreWindow);
                    Mark("boundsmode-done");
                }
                catch (Exception ex) { Mark("boundsmode-FAILED " + ex.GetType().Name + ": " + ex.Message); }
                Window.Current.Activate();
                Mark("activate-done");
            }
            catch (Exception ex)
            {
                Mark("ONLAUNCHED-THROW " + ex.GetType().FullName + ": " + ex.Message
                     + "\r\n" + ex.StackTrace
                     + (ex.InnerException != null
                        ? "\r\ninner: " + ex.InnerException.GetType().FullName + ": "
                          + ex.InnerException.Message
                        : string.Empty));
                throw;
            }
        }

        private void OnSuspending(object sender, SuspendingEventArgs e)
        {
            // Nothing to persist: all state lives in the web app's localStorage,
            // which the WebView2 user data folder keeps across launches.
            e.SuspendingOperation.GetDeferral().Complete();
        }
    }
}

using System;
using System.Linq;
using Windows.Gaming.Input;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Media;

namespace CrypticRealm.Probe
{
    /// <summary>
    /// Bisect probe. Identical UWP/WinUI 2 hosting to the real shell but with
    /// NO WebView2 anywhere: not referenced, not in the project, not loaded.
    ///
    /// Both real apps (Cryptic Realm and RomM for Xbox, different codebases,
    /// same architecture) die immediately after the splash on this console, and
    /// neither has ever been observed running, so there is no known-good
    /// baseline to reason from. This isolates the two candidates:
    ///
    ///   * this launches  -> sideloaded UWP is fine, WebView2 is the fault
    ///   * this also dies -> UWP sideloading itself is broken here, and no
    ///                       amount of shell work would ever have helped
    ///
    /// It also reads Windows.Gaming.Input directly, which proves whether the
    /// native half of the controller path works, the one piece that could not
    /// be verified off-console.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        public MainPage()
        {
            App.Mark("mainpage-ctor-enter");
            InitializeComponent();
            App.Mark("mainpage-initializecomponent-done");
            Detail.Text = "If you can read this, sideloaded UWP works on this console "
                        + "and the fault is WebView2.\n\nOS: "
                        + Windows.System.Profile.AnalyticsInfo.VersionInfo.DeviceFamily
                        + "  " + Windows.System.Profile.AnalyticsInfo.VersionInfo.DeviceFamilyVersion;
            App.Mark("mainpage-detail-set");
            CompositionTarget.Rendering += OnFrame;
            App.Mark("mainpage-ctor-done");
        }

        private void OnFrame(object sender, object e)
        {
            var pad = Gamepad.Gamepads.FirstOrDefault();
            if (pad == null)
            {
                Pad.Text = "controller: none detected";
                return;
            }
            var r = pad.GetCurrentReading();
            Pad.Text = string.Format(
                "controller: OK   buttons={0}   LX={1:0.00} LY={2:0.00}",
                r.Buttons, r.LeftThumbstickX, r.LeftThumbstickY);
        }
    }
}

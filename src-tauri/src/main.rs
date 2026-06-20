// Cryptic Realm desktop shell. Thin Tauri wrapper — the window loads the live
// MMO (configured in tauri.conf.json app.windows[0].url). No custom commands
// yet; the game runs entirely in the webview against the production server.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Cryptic Realm desktop shell");
}

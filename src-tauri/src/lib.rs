use std::sync::{Arc, Mutex}; // 引入锁
use std::time::{Duration, Instant}; // 引入时间控制

use crate::singbox::SingBoxState;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};

pub mod assets;
pub mod config;
pub mod latency;
pub mod settings;
pub mod singbox;
pub mod subscriptions;

fn cleanup_on_exit(app: &AppHandle) {
    println!(">>> App Shutdown: Starting cleanup...");
    let state_guard = app.state::<SingBoxState>().clone();
    let _ = singbox::stop_singbox(app.clone(), state_guard);
    println!(">>> App Shutdown: Cleanup complete.");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }));
    }

    let builder = builder
        .setup(|app| {
                let _ = singbox::disable_system_proxy(2080);
                println!(">>> Startup: Ensured system proxy is disabled.");

                let app_handle = app.handle().clone();

                // =========================================================
                // 2. 系统托盘逻辑
                // =========================================================
                let quit_i = MenuItem::with_id(app, "quit", "退出软件 (Quit)", true, None::<&str>)?;
                let show_i =
                    MenuItem::with_id(app, "show", "显示主窗口 (Show)", true, None::<&str>)?;
                let toggle_i = MenuItem::with_id(
                    app,
                    "toggle_proxy",
                    "开启/关闭代理 (Toggle Proxy)",
                    true,
                    None::<&str>,
                )?;

                let menu = Menu::with_items(app, &[&show_i, &toggle_i, &quit_i])?;

                let last_click_time =
                    Arc::new(Mutex::new(Instant::now() - Duration::from_secs(10)));
                // 克隆一份给 move 闭包使用
                let last_click_for_closure = last_click_time.clone();

                let _tray = TrayIconBuilder::with_id("tray")
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(move |tray_app, event| match event.id.as_ref() {
                        "quit" => {
                            cleanup_on_exit(tray_app);
                            tray_app.exit(0);
                        }
                        "show" => {
                            if let Some(win) = tray_app.get_webview_window("main") {
                                let _ = win.show();
                                let _ = win.unminimize();
                                let _ = win.set_focus();
                            }
                        }
                        "toggle_proxy" => {
                            let _ = tray_app.emit("tray-toggle-proxy", ());
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(move |tray, event| {
                        if let TrayIconEvent::DoubleClick { .. } = event {
                            return; 
                        }

                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            ..
                        } = event
                        {
                            let now = Instant::now();
                            let mut last = last_click_for_closure.lock().unwrap();

                            if now.duration_since(*last) < Duration::from_millis(400) {
                                return;
                            }
                            *last = now;

                            let app = tray.app_handle();
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.unminimize();
                                let _ = win.show();
                                let _ = win.set_focus();
                            }
                        }
                    })
                    .build(app)?;

                // =========================================================
                // 3. 窗口关闭拦截
                // =========================================================
                if let Some(main_window) = app.get_webview_window("main") {
                    let app_handle_for_event = app_handle.clone();
                    main_window.on_window_event(move |event| {
                        if let WindowEvent::CloseRequested { api, .. } = event {
                            api.prevent_close();
                            if let Some(win) = app_handle_for_event.get_webview_window("main") {
                                let _ = win.hide();
                            }
                        }
                    });
                }

                Ok(())
            })
            .manage(SingBoxState::new())
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec![]),
            ))
            .plugin(tauri_plugin_shell::init());

    builder
        .invoke_handler(tauri::generate_handler![
            subscriptions::get_subscriptions,
            subscriptions::add_subscription,
            subscriptions::delete_subscription,
            subscriptions::update_all_subscriptions,
            subscriptions::toggle_subscription_enabled,
            singbox::start_singbox,
            singbox::stop_singbox,
            latency::tcp_ping,
            latency::http_ping,
            settings::get_settings,
            settings::save_settings,
            settings::get_local_ip,
            assets::check_assets,
            assets::download_assets,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
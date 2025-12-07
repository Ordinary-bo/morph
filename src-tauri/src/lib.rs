use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent, Emitter,
};
// ✅ 修复模块引用，只引入 Struct，不引入 module 本身
use crate::singbox::SingBoxState; 

pub mod subscriptions;
pub mod singbox;
pub mod config;
pub mod latency;
pub mod settings;
pub mod assets;

// 辅助函数：在关闭 App 时，优雅地停止代理和进程
fn cleanup_on_exit(app: &AppHandle) {
    println!(">>> App Shutdown: Starting cleanup...");
    let state_guard = app.state::<SingBoxState>().clone(); 
    // 传入 app.clone() 以便读取配置
    let _ = singbox::stop_singbox(app.clone(), state_guard);
    println!(">>> App Shutdown: Cleanup complete.");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let _ = singbox::disable_system_proxy(2080);
            println!(">>> Startup: Ensured system proxy is disabled.");

            // ✅ 核心修复：这里必须显式 clone()，断开与 app 引用的生命周期关联
            let app_handle = app.handle().clone();

            // =========================================================
            // 2. 系统托盘逻辑 (System Tray)
            // =========================================================
            // 创建菜单项
            let quit_i = MenuItem::with_id(app, "quit", "退出软件 (Quit)", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "显示主窗口 (Show)", true, None::<&str>)?;
            let toggle_i = MenuItem::with_id(app, "toggle_proxy", "开启/关闭代理 (Toggle Proxy)", true, None::<&str>)?;
            
            let menu = Menu::with_items(app, &[&show_i, &toggle_i, &quit_i])?;

            let _tray = TrayIconBuilder::with_id("tray")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |tray_app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            // 真正退出：清理 -> 退出
                            cleanup_on_exit(tray_app);
                            tray_app.exit(0);
                        }
                        "show" => {
                            if let Some(win) = tray_app.get_webview_window("main") {
                                let _ = win.show();
                                let _ = win.set_focus();
                            }
                        }
                        "toggle_proxy" => {
                            // 发送事件给前端切换状态
                            let _ = tray_app.emit("tray-toggle-proxy", ());
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                        // 左键点击托盘：切换窗口显示/隐藏
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            if win.is_visible().unwrap_or(false) {
                                let _ = win.hide();
                            } else {
                                let _ = win.show();
                                let _ = win.set_focus();
                            }
                        }
                    }
                })
                .build(app)?; // 这里使用 app 构建托盘

            // =========================================================
            // 3. 窗口关闭拦截 (改为最小化到托盘)
            // =========================================================
            if let Some(main_window) = app.get_webview_window("main") {
                let app_handle_for_event = app_handle.clone(); // 克隆给闭包用
                
                main_window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        // 阻止默认退出
                        api.prevent_close();
                        
                        // 隐藏窗口
                        if let Some(win) = app_handle_for_event.get_webview_window("main") {
                            let _ = win.hide();
                        }
                    }
                });
            }
            
            Ok(())
        })
        .manage(SingBoxState::new())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec![])))
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            subscriptions::get_subscriptions,
            subscriptions::add_subscription,
            subscriptions::delete_subscription,
            subscriptions::update_all_subscriptions,
            subscriptions::toggle_subscription_enabled,
            singbox::start_singbox,
            singbox::stop_singbox,
            latency::tcp_ping,
            settings::get_settings,
            settings::save_settings,
            assets::check_assets,
            assets::download_assets
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
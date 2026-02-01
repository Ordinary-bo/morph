use reqwest::{Client, Proxy};
use std::net::TcpStream;
use std::net::ToSocketAddrs;
use std::time::{Duration, Instant};

const TCP_TIMEOUT_MS: u64 = 2000;
const HTTP_TIMEOUT_MS: u64 = 8000;

#[tauri::command]
pub async fn tcp_ping(address: String, port: u16) -> i32 {
    let target = format!("{}:{}", address, port);
    let start = Instant::now();

    let socket_addr = match target.to_socket_addrs() {
        Ok(mut addrs) => match addrs.next() {
            Some(addr) => addr,
            None => return -1,
        },
        Err(_) => return -1,
    };

    match TcpStream::connect_timeout(&socket_addr, Duration::from_millis(TCP_TIMEOUT_MS)) {
        Ok(_) => {
            let duration = start.elapsed();
            duration.as_millis() as i32
        }
        Err(_) => -1,
    }
}

// ✅ 必须确保这个函数存在，并且逻辑正确
#[tauri::command]
pub async fn http_ping(url: String, proxy_url: Option<String>) -> i32 {
    // 1. 构建 Client
    let mut builder = Client::builder()
        .timeout(Duration::from_millis(HTTP_TIMEOUT_MS))
        .no_proxy() 
        .danger_accept_invalid_certs(true) 
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    // 2. 配置代理
    if let Some(p_url) = proxy_url {
        if !p_url.is_empty() {
            // 打印日志，确认代理地址传进来了
            println!(">>> HTTP测速使用代理: {}", p_url);
            match Proxy::all(&p_url) {
                Ok(proxy) => {
                    builder = builder.proxy(proxy);
                }
                Err(e) => {
                    println!("❌ 代理地址格式错误: {}", e);
                    return -1;
                }
            }
        }
    }

    // 3. 构建
    let client = match builder.build() {
        Ok(c) => c,
        Err(e) => {
            println!("❌ Client 构建失败: {}", e);
            return -1;
        }
    };

    // 4. 发起请求
    let start = Instant::now();
    println!(">>> 正在测速 URL: {}", url); // <--- 这行日志必须出现

    // 使用 GET 请求，兼容性比 HEAD 更好
    match client.get(&url).send().await {
        Ok(resp) => {
            let duration = start.elapsed();
            let ms = duration.as_millis() as i32;
            println!("✅ 测速成功: {}ms (状态码: {})", ms, resp.status());
            ms
        }
        Err(e) => {
            println!("❌ HTTP 请求失败: {}", e);
            -1
        }
    }
}

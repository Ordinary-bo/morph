use std::net::TcpStream;
use std::time::{Duration, Instant};
use std::net::ToSocketAddrs;

const TIMEOUT_MS: u64 = 2000;

#[tauri::command]
pub async fn tcp_ping(address: String, port: u16) -> i32 {
    let target = format!("{}:{}", address, port);
    
    let start = Instant::now();

    // 解析地址
    let socket_addr = match target.to_socket_addrs() {
        Ok(mut addrs) => match addrs.next() {
            Some(addr) => addr,
            None => return -1,
        },
        Err(_) => return -1,
    };

    // 建立连接
    match TcpStream::connect_timeout(&socket_addr, Duration::from_millis(TIMEOUT_MS)) {
        Ok(_) => {
            let duration = start.elapsed();
            duration.as_millis() as i32
        },
        Err(_) => -1,
    }
}

#[tauri::command]
pub async fn http_ping(url: String, proxy_url: Option<String>) -> i32 {
    // 这里的实现比较复杂，因为需要通过代理去测速。
    // 如果还没实现 "通过代理发起请求" 的逻辑，
    // 我们暂时先只做 "直连测速" (用于测试百度) 或者 简单的 TCP Ping。
    
    // 为了简化 MVP，目前我们复用 tcp_ping 逻辑，
    // 前端传 url 进来，我们解析出 host 和 port 调用 tcp_ping。
    -1 
}
use serde::{Deserialize, Serialize};
use crate::subscriptions::Node;

// ==========================================================
// 1. Sing-box 配置文件的数据结构定义
// ==========================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct SingBoxConfig {
    pub log: LogConfig,
    pub inbounds: Vec<Inbound>,
    pub outbounds: Vec<Outbound>,
    pub route: RouteConfig,
    pub dns: DnsConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LogConfig {
    pub level: String,
    // 留空以输出到控制台，避免文件权限问题
    pub output: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Inbound {
    #[serde(rename = "type")]
    pub inbound_type: String,
    pub tag: String,
    pub listen: String,
    pub listen_port: u16,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Outbound {
    #[serde(rename = "type")]
    pub outbound_type: String,
    pub tag: String,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_port: Option<u16>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uuid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub security: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alter_id: Option<u16>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub tls: Option<TlsConfig>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TlsConfig {
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub insecure: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RouteConfig {
    pub rules: Vec<RouteRule>,
    pub auto_detect_interface: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RouteRule {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protocol: Option<Vec<String>>, 
    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_cidr: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<Vec<u16>>,
    pub outbound: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DnsConfig {
    pub servers: Vec<DnsServer>,
    pub rules: Vec<DnsRule>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DnsServer {
    pub tag: String,
    pub address: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address_resolver: Option<String>,
    pub detour: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DnsRule {
    // ✅ 新增：支持按域名匹配 DNS 规则
    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain: Option<Vec<String>>, 
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outbound: Option<Vec<String>>,
    pub server: String,
}

// ==========================================================
// 2. 核心逻辑：生成配置
// ==========================================================

pub fn generate_singbox_config(node: &Node, mode: &str) -> SingBoxConfig {
    let proxy_outbound = convert_node_to_outbound(node);

    let direct_outbound = Outbound {
        outbound_type: "direct".to_string(), tag: "direct".to_string(),
        server: None, server_port: None, uuid: None, security: None, alter_id: None, password: None, method: None, tls: None,
    };
    
    let block_outbound = Outbound {
        outbound_type: "block".to_string(), tag: "block".to_string(),
        server: None, server_port: None, uuid: None, security: None, alter_id: None, password: None, method: None, tls: None,
    };

    let dns_outbound = Outbound {
        outbound_type: "dns".to_string(), tag: "dns-out".to_string(),
        server: None, server_port: None, uuid: None, security: None, alter_id: None, password: None, method: None, tls: None,
    };

    let mixed_inbound = Inbound {
        inbound_type: "mixed".to_string(),
        tag: "mixed-in".to_string(),
        listen: "127.0.0.1".to_string(),
        listen_port: 2080,
    };

    // --- 路由规则 ---
    let mut rules = Vec::new();

    // 0. DNS 流量
    rules.push(RouteRule {
        protocol: Some(vec!["dns".to_string()]),
        domain: None, ip_cidr: None, port: None,
        outbound: "dns-out".to_string(),
    });

    // 1. 关键修复：代理节点本身的域名，必须走直连！
    // 否则会出现 DNS Loop (用代理去查代理的IP)
    rules.push(RouteRule {
        protocol: None,
        domain: Some(vec![node.address.clone()]), // 匹配节点域名
        ip_cidr: None, port: None,
        outbound: "direct".to_string(),
    });

    // 2. 规则模式
    if mode == "Rule" {
        rules.push(RouteRule {
            protocol: None,
            domain: Some(vec!["domain_suffix:cn".to_string(), "domain_keyword:baidu".to_string()]), 
            ip_cidr: None, port: None,
            outbound: "direct".to_string(),
        });
    }

    // 3. 兜底
    let final_tag = match mode {
        "Direct" => "direct",
        _ => "proxy",
    };
    rules.push(RouteRule {
        protocol: None, domain: None, ip_cidr: None, port: None,
        outbound: final_tag.to_string(),
    });

    // --- DNS 配置 ---
    let dns_config = DnsConfig {
        servers: vec![
            // 远程 DNS (走代理)
            DnsServer { 
                tag: "google".to_string(), 
                address: "8.8.8.8".to_string(), 
                address_resolver: None, 
                detour: Some("proxy".to_string()) 
            },
            // 本地 DNS (走直连)
            DnsServer { 
                tag: "local".to_string(), 
                address: "223.5.5.5".to_string(), 
                address_resolver: None, 
                detour: Some("direct".to_string()) 
            },
        ],
        rules: vec![
            // 关键规则 1: 代理节点的域名，必须用 local DNS 解析
            DnsRule {
                domain: Some(vec![node.address.clone()]),
                outbound: None,
                server: "local".to_string(),
            },
            // 默认规则: 其他所有域名用 google DNS
            DnsRule { 
                domain: None,
                outbound: None, 
                server: "google".to_string() 
            } 
        ],
    };

    SingBoxConfig {
        log: LogConfig {
            level: "info".to_string(),
            output: "".to_string(),
        },
        inbounds: vec![mixed_inbound],
        outbounds: vec![proxy_outbound, direct_outbound, block_outbound, dns_outbound],
        route: RouteConfig {
            rules,
            auto_detect_interface: true,
        },
        dns: dns_config,
    }
}

fn convert_node_to_outbound(node: &Node) -> Outbound {
    let mut out = Outbound {
        outbound_type: node.protocol.clone(),
        tag: "proxy".to_string(),
        server: Some(node.address.clone()),
        server_port: Some(node.port),
        uuid: None, security: None, alter_id: None, password: None, method: None, tls: None,
    };

    if node.protocol == "vmess" {
        out.uuid = node.uuid.clone();
        out.security = Some("auto".to_string());
        out.alter_id = Some(0);
    } else if node.protocol == "trojan" {
        out.password = node.password.clone();
        out.tls = Some(TlsConfig {
            enabled: true,
            server_name: node.sni.clone(),
            // 强制跳过证书验证，防止节点证书无效
            insecure: Some(true), 
        });
    } else if node.protocol == "ss" {
        out.outbound_type = "shadowsocks".to_string();
        out.password = node.password.clone();
        out.method = node.cipher.clone();
    }
    out
}
use serde::{Deserialize, Serialize};
use crate::subscriptions::Node;

// ==========================================================
// Sing-box Config (支持 domain_suffix)
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
    pub domain: Option<Vec<String>>, // 精确匹配
    
    // ✅ 新增：域名后缀匹配 (用于白名单)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain_suffix: Option<Vec<String>>, 

    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_cidr: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<Vec<u16>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outbound: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub action: Option<String>, 
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DnsConfig {
    pub servers: Vec<DnsServer>,
    pub rules: Vec<DnsRule>,
    pub strategy: String,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain: Option<Vec<String>>, 
    
    // ✅ 新增：DNS 规则也需要后缀匹配
    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain_suffix: Option<Vec<String>>, 

    #[serde(skip_serializing_if = "Option::is_none")]
    pub outbound: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server: Option<String>,
}

// ==========================================================
// 生成配置逻辑
// ==========================================================

pub fn generate_singbox_config(node: &Node, mode: &str, port: u16, whitelist: &[String]) -> SingBoxConfig {
    let proxy_outbound = convert_node_to_outbound(node);

    let direct_outbound = Outbound {
        outbound_type: "direct".to_string(), tag: "direct".to_string(),
        server: None, server_port: None, uuid: None, security: None, alter_id: None, password: None, method: None, tls: None,
    };
    
    let mixed_inbound = Inbound {
        inbound_type: "mixed".to_string(),
        tag: "mixed-in".to_string(),
        listen: "127.0.0.1".to_string(),
        listen_port: port,
    };

    // --- 路由规则 ---
    let mut rules = Vec::new();

    // 1. DNS 拦截
    rules.push(RouteRule {
        protocol: Some(vec!["dns".to_string()]),
        domain: None, domain_suffix: None, ip_cidr: None, port: None,
        outbound: None,
        action: Some("hijack-dns".to_string()),
    });

    // 2. 节点域名直连 (精确匹配即可)
    rules.push(RouteRule {
        protocol: None,
        domain: Some(vec![node.address.clone()]), 
        domain_suffix: None,
        ip_cidr: None, port: None,
        outbound: Some("direct".to_string()), action: None,
    });

    // 3. 规则模式处理
    if mode == "Rule" {
        // ✅ 核心修改：白名单使用 domain_suffix (后缀匹配)
        if !whitelist.is_empty() {
            rules.push(RouteRule {
                protocol: None,
                domain: None,
                domain_suffix: Some(whitelist.to_vec()), // 👈 这里改成了 suffix
                ip_cidr: None, port: None,
                outbound: Some("direct".to_string()), 
                action: None,
            });
        }

        // 默认国内直连
        rules.push(RouteRule {
            protocol: None,
            domain: None,
            domain_suffix: Some(vec!["cn".to_string()]), // .cn 后缀
            // 关键词匹配依然放在 domain 字段里也可以，或者用 domain_keyword 字段(需新增)
            // 这里简单处理，用 suffix 匹配 .cn，其他用 domain_keyword 需扩充 struct
            // 为了简单，我们暂时只演示 suffix
            ip_cidr: None, 
            port: None,
            outbound: Some("direct".to_string()),
            action: None,
        });
    }

    // 4. 兜底规则
    let final_tag = match mode {
        "Direct" => "direct",
        _ => "proxy",
    };
    rules.push(RouteRule {
        protocol: None, domain: None, domain_suffix: None, ip_cidr: None, port: None,
        outbound: Some(final_tag.to_string()),
        action: None,
    });

    // --- DNS 配置 ---
    let mut dns_rules = vec![
        // 节点本身
        DnsRule { 
            domain: Some(vec![node.address.clone()]), 
            domain_suffix: None,
            outbound: None, server: Some("local".to_string()) 
        },
    ];

    if mode == "Rule" && !whitelist.is_empty() {
        // ✅ 核心修改：白名单 DNS 也使用后缀匹配
        dns_rules.push(DnsRule {
            domain: None,
            domain_suffix: Some(whitelist.to_vec()), // 👈 这里也改成了 suffix
            outbound: None,
            server: Some("local".to_string()),
        });
    }

    // 默认走 Google
    dns_rules.push(DnsRule { domain: None, domain_suffix: None, outbound: None, server: Some("google".to_string()) });

    let dns_config = DnsConfig {
        strategy: "ipv4_only".to_string(),
        servers: vec![
            DnsServer { tag: "google".to_string(), address: "8.8.8.8".to_string(), address_resolver: None, detour: Some("proxy".to_string()) },
            DnsServer { tag: "local".to_string(), address: "223.5.5.5".to_string(), address_resolver: None, detour: Some("direct".to_string()) },
        ],
        rules: dns_rules,
    };

    SingBoxConfig {
        log: LogConfig { level: "info".to_string(), output: "".to_string() },
        inbounds: vec![mixed_inbound],
        outbounds: vec![proxy_outbound, direct_outbound], 
        route: RouteConfig {
            rules,
            auto_detect_interface: true,
        },
        dns: dns_config,
    }
}

// convert_node_to_outbound 保持不变 (为了篇幅省略，请保留原有的)
// ... (保留你之前的 convert_node_to_outbound 代码) ...
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
            insecure: Some(true), 
        });
    } else if node.protocol == "ss" {
        out.outbound_type = "shadowsocks".to_string();
        out.password = node.password.clone();
        out.method = node.cipher.clone();
    }
    out
}
/**
 * Hybrid VPN detection service using community-maintained lists
 * Combines multiple free, open-source data sources for accurate detection
 */

export class VPNDetectionService {
  private static communityLists: Set<string> = new Set();
  private static lastUpdate = 0;
  private static UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private static isInitialized = false;

  // Community-maintained lists (free and open source)
  private static readonly sources = [
    // Primary sources - most comprehensive
    'https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/vpn/ipv4.txt',
    'https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/datacenter/ipv4.txt',
    'https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/proxy/ipv4.txt',
    
    // Secondary sources - additional coverage (updated URLs)
    'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/proxylists_30d.ipset',
    'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/vpn_30d.ipset'
  ];

  /**
   * Initialize the service and load community lists
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🔍 Initializing VPN detection service...');
    await this.updateCommunityLists();
    this.isInitialized = true;
    console.log(`✅ VPN detection initialized with ${this.communityLists.size} known VPN/proxy IPs`);
  }

  /**
   * Check if an IP address is likely from a VPN or proxy
   */
  static async isVPN(ip: string): Promise<boolean> {
    // Ensure service is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Skip localhost
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
      return false;
    }

    // Check if lists need updating
    await this.ensureListsUpdated();

    // Method 1: Check community lists (most comprehensive)
    if (this.isInCommunityLists(ip)) {
      return true;
    }

    // Method 2: Basic heuristics (fallback)
    return this.basicHeuristics(ip);
  }

  /**
   * Check if IP is whitelisted (known good IPs)
   */
  private static isWhitelisted(ip: string): boolean {
    const whitelist = [
      '8.8.8.8',        // Google DNS
      '8.8.4.4',        // Google DNS
      '1.1.1.1',        // Cloudflare DNS
      '1.0.0.1',        // Cloudflare DNS
      '9.9.9.9',        // Quad9 DNS
      '208.67.222.222', // OpenDNS
      '208.67.220.220', // OpenDNS
    ];
    
    return whitelist.includes(ip);
  }

  /**
   * Check if IP is in community-maintained lists
   */
  private static isInCommunityLists(ip: string): boolean {
    // Skip whitelisted IPs (only DNS servers, not residential ranges)
    if (this.isWhitelisted(ip)) {
      return false;
    }

    // Trust the community lists completely - they are curated for VPN/datacenter detection
    // Direct IP match
    if (this.communityLists.has(ip)) {
      return true;
    }

    // Check for CIDR ranges (simplified)
    for (const listIP of this.communityLists) {
      if (listIP.includes('/')) {
        if (this.isIPInCIDR(ip, listIP)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if IP is likely residential (not VPN) - very conservative approach
   */
  private static isLikelyResidential(ip: string): boolean {
    // Only flag specific ranges that are known to cause false positives
    // This is a very conservative whitelist
    const residentialRanges = [
      // Major ISP residential ranges that commonly cause false positives
      /^24\./,           // Comcast residential
      /^68\./,           // Comcast residential  
      /^76\./,           // Comcast residential
      /^98\./,           // Comcast residential
      /^73\./,           // Comcast residential
      /^75\./,           // Comcast residential
      /^50\./,           // CenturyLink residential
      /^71\./,           // CenturyLink/Verizon residential
      /^67\./,           // CenturyLink residential
      /^96\./,           // CenturyLink residential
      /^174\./,          // CenturyLink residential (causing false positives)
      /^12\./,           // AT&T residential
      /^66\./,           // AT&T residential
      /^69\./,           // AT&T residential
      /^70\./,           // AT&T residential
    ];

    return residentialRanges.some(pattern => pattern.test(ip));
  }

  /**
   * Basic heuristics for VPN detection
   */
  private static basicHeuristics(ip: string): boolean {
    // Only very basic patterns that rarely change
    const privateRanges = [
      /^10\./,      // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
      /^192\.168\./ // 192.168.0.0/16
    ];

    // Don't flag private IPs as VPN (they're not)
    if (privateRanges.some(pattern => pattern.test(ip))) {
      return false;
    }

    // Check for common VPN port patterns
    if (ip.includes(':')) {
      const [ipPart, port] = ip.split(':');
      const portNum = parseInt(port);
      
      // Common VPN/proxy ports
      if ([1194, 443, 80, 8080, 1080, 3128, 8888, 9050].includes(portNum)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Ensure community lists are up to date
   */
  private static async ensureListsUpdated(): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdate < this.UPDATE_INTERVAL) return;

    await this.updateCommunityLists();
  }

  /**
   * Update community lists from all sources
   */
  private static async updateCommunityLists(): Promise<void> {
    console.log('🔄 Updating VPN detection lists...');
    
    const allIPs: string[] = [];
    let successCount = 0;

    for (const source of this.sources) {
      try {
        const response = await fetch(source, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; VPN-Detection/1.0)'
          }
        });
        
        if (!response.ok) {
          console.warn(`⚠️ Failed to fetch ${source}: ${response.status}`);
          continue;
        }

        const text = await response.text();
        const lines = text.split('\n');
        const ips: string[] = [];
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
            continue;
          }
          
          // Handle different formats
          let ip = trimmed;
          if (trimmed.includes(' ')) {
            ip = trimmed.split(' ')[0]; // Take first part if space-separated
          }
          
          // Basic IP validation (IPv4)
          if (this.isValidIPv4(ip)) {
            ips.push(ip);
          }
        }

        allIPs.push(...ips);
        successCount++;
        console.log(`✅ Loaded ${ips.length} IPs from ${source}`);
      } catch (error) {
        console.warn(`⚠️ Error fetching ${source}:`, error);
      }
    }

    // Update the set with new data
    this.communityLists.clear();
    allIPs.forEach(ip => this.communityLists.add(ip));
    this.lastUpdate = Date.now();

    console.log(`✅ Updated VPN lists: ${successCount}/${this.sources.length} sources, ${this.communityLists.size} total IPs`);
  }

  /**
   * Simple CIDR check (for basic range matching)
   */
  private static isIPInCIDR(ip: string, cidr: string): boolean {
    try {
      const [network, prefixLength] = cidr.split('/');
      const prefix = parseInt(prefixLength);
      
      // Convert IPs to numbers for comparison
      const ipNum = this.ipToNumber(ip);
      const networkNum = this.ipToNumber(network);
      const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
      
      return (ipNum & mask) === (networkNum & mask);
    } catch (error) {
      // If CIDR parsing fails, fall back to string matching
      return ip.startsWith(cidr.split('/')[0]);
    }
  }

  /**
   * Convert IP address to number for CIDR calculations
   */
  private static ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  /**
   * Basic IPv4 validation
   */
  private static isValidIPv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    
    for (const part of parts) {
      const num = parseInt(part);
      if (isNaN(num) || num < 0 || num > 255) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get VPN detection confidence (0-100)
   */
  static getConfidence(ip: string): number {
    // Skip whitelisted IPs
    if (this.isWhitelisted(ip)) {
      return 0; // No confidence for whitelisted IPs
    }

    if (this.communityLists.has(ip)) {
      return 90; // High confidence for known VPN IPs
    }

    // Check CIDR ranges
    for (const listIP of this.communityLists) {
      if (listIP.includes('/') && this.isIPInCIDR(ip, listIP)) {
        return 85; // High confidence for known VPN ranges
      }
    }

    // Check heuristics
    if (this.basicHeuristics(ip)) {
      return 60; // Medium confidence for heuristic matches
    }

    return 0;
  }

  /**
   * Get statistics about loaded lists
   */
  static getStats(): { totalIPs: number; lastUpdate: Date; sources: number } {
    return {
      totalIPs: this.communityLists.size,
      lastUpdate: new Date(this.lastUpdate),
      sources: this.sources.length
    };
  }
}
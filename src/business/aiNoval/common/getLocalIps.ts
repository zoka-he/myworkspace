import os from 'os'

// 返回所有符合条件的IP数组
function getAllLocalIPs() {
    console.log('------- os.networkInterfaces()', os.networkInterfaces());

    return Object.entries(os.networkInterfaces())
        .filter(([key, ifList]) => {
            if (key.toLowerCase().includes('vmware')) return false;

            return true;
        })
        .map(([key, ifList]) => ifList)
        .flat() 
        .filter(iface => {
            if (!iface) return false;
            if (iface.family !== 'IPv4') return false;
            if (iface.internal) return false;
            if (iface.address.startsWith('127.')) return false;
            if (iface.address.includes('virtual')) return false;
            if (iface.address.startsWith('169.254.')) return false;

            if (iface.address.startsWith('192.168.')) return true;
            if (iface.address.startsWith('10.')) return true;
            if (iface.address.startsWith('172.')) return true;

            return false;
        })
        .map(iface => iface?.address);
  }

  // 优先选择特定接口（如以太网）
function getPreferredIP() {
    const priorityInterfaces = ['eth0', 'en0', 'wlan0']; // 常见物理接口名称
    const allIPs = getAllLocalIPs();
    
    // 按优先级排序
    for (const name of priorityInterfaces) {
      const ip = allIPs.find(ip => 
        os.networkInterfaces()[name]?.some(i => i.address === ip)
      );
      if (ip) return ip;
    }
    
    return allIPs[0]; // 返回第一个可用IP
}

export default {
    getAllLocalIPs,
    getPreferredIP
}
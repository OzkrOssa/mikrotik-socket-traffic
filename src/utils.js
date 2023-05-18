export function formatSize(size) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let i = 0;
    let floatSize = parseFloat(size);
  
    while (floatSize >= 1024 && i < units.length - 1) {
      floatSize /= 1024;
      i++;
    }
  
    return floatSize.toFixed(2) + ' ' + units[i];
  }
  
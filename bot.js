const os = require('os');
const axios = require('axios');


const WEBHOOK_URL = '';
let seconds = 60; 
const INTERVAL = seconds * 1000; 

function getCPUInfo() {
    const cpus = os.cpus();
    return cpus.map(cpu => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return { idle: cpu.times.idle, total: total };
    });
}

async function startMonitoring() {
    console.log(`🚀 Bắt đầu gửi mỗi ${seconds} giây...`);

    while (true) {
        const stats1 = getCPUInfo();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Đo mẫu trong 1s
        const stats2 = getCPUInfo();
        
        let coreDetails = "";
        let totalUsageSum = 0;

        stats2.forEach((stat, i) => {
            const idleDiff = stat.idle - stats1[i].idle;
            const totalDiff = stat.total - stats1[i].total;
            const usage = 100 - Math.floor(100 * idleDiff / totalDiff);
            totalUsageSum += usage;
            coreDetails += `**Core ${i + 1}:** \`${usage}%\` \n`;
        });

        const avgUsage = Math.floor(totalUsageSum / stats2.length);

        const embedData = {
            embeds: [{
                title: "🖥️ Status CPU",
                color: avgUsage > 80 ? 15158332 : 3066993,
                fields: [
                    { name: "Máy chủ", value: `\`${os.hostname()}\``, inline: true },
                    { name: "Tổng số nhân", value: `\`${os.cpus().length} Cores\``, inline: true },
                    { name: "🔥 CPU Tổng", value: `\`${avgUsage}%\``, inline: false },
                    { name: "📍 Chi tiết từng nhân", value: coreDetails, inline: false }
                ],
                footer: { text: `Tự động cập nhật mỗi ${seconds} giây` },
                timestamp: new Date()
            }]
        };

        try {
            await axios.post(WEBHOOK_URL, embedData);
            console.log(`✅ Đã gửi: CPU Tổng ${avgUsage}% (Chờ ${seconds}s...)`);
        } catch (error) {
            console.error('❌ Lỗi:', error.message);
        }

        await new Promise(resolve => setTimeout(resolve, INTERVAL));
    }
}

startMonitoring();

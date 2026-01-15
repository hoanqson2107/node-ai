const os = require('os');
const axios = require('axios');

const WEBHOOK_URL = process.argv[2];
const seconds = parseInt(process.argv[3]) || 60;

if (!WEBHOOK_URL) {
    console.log('❌ Thiếu webhook!');
    console.log('👉 Dùng: node bot.js <WEBHOOK_URL> [seconds]');
    process.exit(1);
}

const INTERVAL = seconds * 1000;

function getCPUInfo() {
    return os.cpus().map(cpu => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return { idle: cpu.times.idle, total };
    });
}

async function startMonitoring() {
    console.log(`🚀 Bắt đầu gửi CPU mỗi ${seconds} giây`);
    console.log(`🌐 Webhook: ${WEBHOOK_URL}`);

    while (true) {
        const stats1 = getCPUInfo();
        await new Promise(r => setTimeout(r, 1000));
        const stats2 = getCPUInfo();

        let coreDetails = '';
        let totalUsage = 0;

        stats2.forEach((stat, i) => {
            const idleDiff = stat.idle - stats1[i].idle;
            const totalDiff = stat.total - stats1[i].total;
            const usage = Math.max(0, 100 - Math.floor(100 * idleDiff / totalDiff));
            totalUsage += usage;
            coreDetails += `**Core ${i + 1}:** \`${usage}%\`\n`;
        });

        const avgUsage = Math.floor(totalUsage / stats2.length);

        const embedData = {
            embeds: [{
                title: '🖥️ Status CPU',
                color: avgUsage > 80 ? 15158332 : 3066993,
                fields: [
                    { name: 'Máy chủ', value: `\`${os.hostname()}\``, inline: true },
                    { name: 'Số nhân', value: `\`${os.cpus().length}\``, inline: true },
                    { name: '🔥 CPU Tổng', value: `\`${avgUsage}%\``, inline: false },
                    { name: '📍 Chi tiết từng nhân', value: coreDetails, inline: false }
                ],
                footer: { text: `Cập nhật mỗi ${seconds}s` },
                timestamp: new Date()
            }]
        };

        try {
            await axios.post(WEBHOOK_URL, embedData);
            console.log(`✅ Đã gửi CPU ${avgUsage}%`);
        } catch (e) {
            console.error('❌ Lỗi gửi webhook:', e.message);
        }

        await new Promise(r => setTimeout(r, INTERVAL));
    }
}

startMonitoring();

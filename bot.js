const os = require('os');
const axios = require('axios');

/**
 * Dùng:
 * node bot.js <WEBHOOK_URL> [seconds]
 */

const WEBHOOK_URL = process.argv[2];
const seconds = parseInt(process.argv[3]) || 60;

if (!WEBHOOK_URL) {
    console.log('❌ Thiếu webhook');
    console.log('👉 node bot.js <WEBHOOK_URL> [seconds]');
    process.exit(1);
}

const INTERVAL = seconds * 1000;

// Lưu message ID cũ
let lastMessageId = null;

function getCPUInfo() {
    return os.cpus().map(cpu => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return { idle: cpu.times.idle, total };
    });
}

async function deleteOldMessage() {
    if (!lastMessageId) return;

    try {
        await axios.delete(`${WEBHOOK_URL}/messages/${lastMessageId}`);
    } catch (err) {
        // Tin bị xoá tay hoặc lỗi → bỏ qua
    }
}

async function startMonitoring() {
    console.log(`🚀 Gửi CPU mỗi ${seconds}s`);
    console.log(`♻️ Tự xoá embed cũ (chỉ giữ 1 tin)`);

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
            // Xoá tin cũ
            await deleteOldMessage();

            // Gửi tin mới
            const res = await axios.post(
                WEBHOOK_URL + '?wait=true',
                embedData
            );

            // Lưu message ID mới
            lastMessageId = res.data.id;

            console.log(`✅ CPU ${avgUsage}% (đã thay tin cũ)`);

        } catch (err) {
            console.error('❌ Lỗi:', err.message);
        }

        await new Promise(r => setTimeout(r, INTERVAL));
    }
}

startMonitoring();

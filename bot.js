const os = require('os');
const fs = require('fs');
const axios = require('axios');

const CONFIG_FILE = './config.json';

/**
 * Lần đầu:
 * node bot.js <WEBHOOK_URL> [seconds] [name]
 *
 * Lần sau:
 * node bot.js
 */

// ===== LOAD / SAVE CONFIG =====
let config = {};

if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

// Lấy từ command line nếu có
const WEBHOOK_URL = process.argv[2] || config.webhook;
const seconds = parseInt(process.argv[3]) || config.seconds || 60;
const NAME = process.argv[4] || config.name || os.hostname();

// Nếu chạy lần đầu mà thiếu webhook → báo lỗi
if (!WEBHOOK_URL) {
    console.log('❌ Chưa có webhook!');
    console.log('👉 Lần đầu dùng: node bot.js <WEBHOOK_URL> [seconds] [name]');
    process.exit(1);
}

// Lưu config nếu có tham số truyền vào
if (process.argv.length > 2) {
    fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify(
            { webhook: WEBHOOK_URL, seconds, name: NAME },
            null,
            2
        )
    );
    console.log('💾 Đã lưu cấu hình vào config.json');
}

const INTERVAL = seconds * 1000;
let lastMessageId = null;

// ===== CPU =====
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
    } catch {}
}

async function startMonitoring() {
    console.log(`🚀 CPU Monitor: ${NAME}`);
    console.log(`⏱ ${seconds}s | ♻️ Giữ 1 tin`);

    while (true) {
        const s1 = getCPUInfo();
        await new Promise(r => setTimeout(r, 1000));
        const s2 = getCPUInfo();

        let coreDetails = '';
        let totalUsage = 0;

        s2.forEach((stat, i) => {
            const idleDiff = stat.idle - s1[i].idle;
            const totalDiff = stat.total - s1[i].total;
            const usage = Math.max(0, 100 - Math.floor(100 * idleDiff / totalDiff));
            totalUsage += usage;
            coreDetails += `**Core ${i + 1}:** \`${usage}%\`\n`;
        });

        const avgUsage = Math.floor(totalUsage / s2.length);

        const embedData = {
            embeds: [{
                title: `🖥️ Status CPU — ${NAME}`,
                color: avgUsage > 80 ? 15158332 : 3066993,
                fields: [
                    { name: 'Tên', value: `\`${NAME}\``, inline: true },
                    { name: 'Host', value: `\`${os.hostname()}\``, inline: true },
                    { name: 'CPU Tổng', value: `\`${avgUsage}%\``, inline: false },
                    { name: 'Chi tiết từng nhân', value: coreDetails, inline: false }
                ],
                footer: { text: `Cập nhật mỗi ${seconds}s` },
                timestamp: new Date()
            }]
        };

        try {
            await deleteOldMessage();

            const res = await axios.post(
                WEBHOOK_URL + '?wait=true',
                embedData
            );

            lastMessageId = res.data.id;
            console.log(`✅ ${NAME} | CPU ${avgUsage}%`);
        } catch (e) {
            console.error('❌ Lỗi:', e.message);
        }

        await new Promise(r => setTimeout(r, INTERVAL));
    }
}

startMonitoring();    console.log(`⏱ ${seconds}s | ♻️ Chỉ giữ 1 tin`);

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
                title: `🖥️ Status CPU — ${NAME}`,
                color: avgUsage > 80 ? 15158332 : 3066993,
                fields: [
                    { name: 'Tên', value: `\`${NAME}\``, inline: true },
                    { name: 'Host', value: `\`${os.hostname()}\``, inline: true },
                    { name: 'CPU Tổng', value: `\`${avgUsage}%\``, inline: false },
                    { name: 'Chi tiết từng nhân', value: coreDetails, inline: false }
                ],
                footer: { text: `Cập nhật mỗi ${seconds}s` },
                timestamp: new Date()
            }]
        };

        try {
            await deleteOldMessage();

            const res = await axios.post(
                WEBHOOK_URL + '?wait=true',
                embedData
            );

            lastMessageId = res.data.id;
            console.log(`✅ ${NAME} | CPU ${avgUsage}%`);
        } catch (e) {
            console.error('❌ Lỗi:', e.message);
        }

        await new Promise(r => setTimeout(r, INTERVAL));
    }
}

startMonitoring();

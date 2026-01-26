const os = require('os');
const fs = require('fs');
const axios = require('axios');

const CONFIG_FILE = './config.json';

let config = {};
if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

const WEBHOOK_URL = process.argv[2] || config.webhook;
const seconds = parseInt(process.argv[3]) || config.seconds || 60;
const NAME = process.argv[4] || config.name || os.hostname();

if (!WEBHOOK_URL) {
    console.log('❌ Chưa có webhook!');
    console.log('👉 node bot.js <WEBHOOK_URL> [seconds] [name]');
    process.exit(1);
}

if (process.argv.length > 2) {
    fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify({ webhook: WEBHOOK_URL, seconds, name: NAME }, null, 2)
    );
    console.log('💾 Đã lưu cấu hình vào config.json');
}

const INTERVAL = seconds * 1000;
let lastMessageId = null;

/* ================= CPU ================= */

function getCPUInfo() {
    return os.cpus().map(cpu => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return { idle: cpu.times.idle, total };
    });
}

/* ================= Discord ================= */

async function deleteOldMessage() {
    if (!lastMessageId) return;
    try {
        await axios.delete(`${WEBHOOK_URL}/messages/${lastMessageId}`);
    } catch {}
}

/* ================= Monitor ================= */

async function startMonitoring() {
    console.log(`🚀 CPU Monitor: ${NAME}`);
    console.log(`⏱ Update mỗi ${seconds}s`);
    console.log(`🧠 CPU cores: ${os.cpus().length}`);

    while (true) {
        const s1 = getCPUInfo();
        await new Promise(r => setTimeout(r, 1000));
        const s2 = getCPUInfo();

        let totalUsage = 0;
        let rows = [];
        let row = [];

        const PER_ROW = 10;

        s2.forEach((stat, i) => {
            const idleDiff = stat.idle - s1[i].idle;
            const totalDiff = stat.total - s1[i].total;
            const usage = Math.max(
                0,
                100 - Math.floor(100 * idleDiff / totalDiff)
            );

            totalUsage += usage;

            // fixed width: C001:099%
            const label =
                `C${String(i + 1).padStart(3, '0')}:` +
                `${String(usage).padStart(3, '0')}%`;

            row.push(label);

            if (row.length === PER_ROW) {
                rows.push(row.join('  '));
                row = [];
            }
        });

        if (row.length > 0) {
            rows.push(row.join('  '));
        }

        const avgUsage = Math.floor(totalUsage / s2.length);

        const coreDetails = '```' + rows.join('\n') + '```';

        const embedData = {
            embeds: [
                {
                    title: `🖥️ CPU Status — ${NAME}`,
                    color: avgUsage > 80 ? 15158332 : 3066993,
                    fields: [
                        { name: 'Tên', value: `\`${NAME}\``, inline: true },
                        {
                            name: 'Host',
                            value: `\`${os.hostname()}\``,
                            inline: true
                        },
                        {
                            name: 'CPU Tổng',
                            value: `\`${avgUsage}%\``,
                            inline: true
                        },
                        {
                            name: `Chi tiết (${s2.length} cores)`,
                            value: coreDetails,
                            inline: false
                        }
                    ],
                    footer: {
                        text: `Cập nhật mỗi ${seconds}s | Giữ 1 tin`
                    },
                    timestamp: new Date()
                }
            ]
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
            if (e.response) {
                console.error('❌ Discord:', e.response.data);
            } else {
                console.error('❌ Lỗi:', e.message);
            }
        }

        await new Promise(r => setTimeout(r, INTERVAL));
    }
}

startMonitoring();

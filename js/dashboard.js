const params = new URLSearchParams(window.location.search);
const username = params.get('user');

let chartInstance = null;

const profile = document.querySelector('.profile');
const commitStatus = document.getElementById("commit-status");

// ==========================
// INIT
// ==========================
if (!username) {
    profile.innerHTML = "No username provided";
} else {
    init();
}

async function init() {
    try {
        const [user, repos, events] = await Promise.all([
            fetchUser(),
            fetchRepos(),
            fetchEvents()
        ]);

        displayUserInfo(user);
        displayRepos(repos);
        calculateLanguage(repos);
        calculateStats(repos);

        // COMMITS + HEATMAP + STREAK
        const commitData = processCommits(events);

        if (Object.keys(commitData).length === 0) {
            commitStatus.textContent = "No recent commits found.";
            displayCommitsChart({});
            renderHeatmap(buildHeatmapDataFromCommitData({}));
        } else {
            displayCommitsChart(commitData);
            renderHeatmap(buildHeatmapDataFromCommitData(commitData));
        }

        calculateWeeklyCommits(events);
        calculateStreak(events);

    } catch (err) {
        console.error(err);
        profile.innerHTML = "Error loading data";
    }
}

// ==========================
// API CALLS
// ==========================
async function fetchUser() {
    const res = await fetch(`https://api.github.com/users/${username}`);
    if (!res.ok) throw new Error("User not found");
    return res.json();
}

async function fetchRepos() {
    const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`);
    return res.json();
}

async function fetchEvents() {
    const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=300`);
    if (!res.ok) return [];
    return res.json();
}

// ==========================
// USER UI
// ==========================
function displayUserInfo(user) {
    document.getElementById("avatar").src = user.avatar_url;
    document.getElementById("name").textContent = user.name || user.login;
    document.getElementById("username").textContent = "@" + user.login;
    document.getElementById("bio").textContent = user.bio || "No bio";
    document.getElementById("repo").textContent = user.public_repos;
    document.getElementById("followers").textContent = user.followers;
    document.getElementById("following").textContent = user.following;
}

// ==========================
// REPOS
// ==========================
function displayRepos(repos) {
    const container = document.querySelector('.repo');

    if (!repos.length) {
        container.innerHTML = "<p>No repos found</p>";
        return;
    }

    const sorted = [...repos].sort((a, b) =>
        new Date(b.pushed_at) - new Date(a.pushed_at)
    );

    container.innerHTML = `
        <div class="repo-title-row">
            <h3>Repositories</h3>
            <span class="repo-total">${sorted.length}</span>
        </div>
        <div class="repo-list"></div>
    `;

    const list = container.querySelector(".repo-list");

    sorted.forEach((repo, index) => {
        const div = document.createElement("div");
        div.className = "repo-card";

        div.innerHTML = `
            <div class="repo-header">
                <h4>${repo.name}</h4>
                <div class="repo-badges">
                    ${index === 0 ? '<span class="tag active-tag">Most Active</span>' : ''}
                    ${repo.fork ? '<span class="tag fork-tag">Forked</span>' : ''}
                    <span class="lang">${repo.language || "N/A"}</span>
                </div>
            </div>

            <div class="repo-stats">
                ⭐ ${repo.stargazers_count}
                🍴 ${repo.forks_count}
            </div>

            <a href="${repo.html_url}" target="_blank" class="repo-link">
                View Repo →
            </a>
        `;

        list.appendChild(div);
    });
}

// ==========================
// LANGUAGES
// ==========================
function calculateLanguage(repos) {
    const map = {};

    repos.forEach(r => {
        if (r.language) {
            map[r.language] = (map[r.language] || 0) + 1;
        }
    });

    displayLanguages(map);
}

function displayLanguages(languages) {
    const container = document.getElementById("language-list");
    container.innerHTML = "";

    const total = Object.values(languages).reduce((a, b) => a + b, 0);

    Object.entries(languages).forEach(([lang, count]) => {
        const percent = ((count / total) * 100).toFixed(1);

        const div = document.createElement("div");
        div.className = "language-item";

        div.innerHTML = `
            <div class="language-header">
                <span>${lang}</span>
                <span>${percent}%</span>
            </div>
            <div class="lang-bar">
                <div class="lang-fill" style="width:${percent}%"></div>
            </div>
        `;

        container.appendChild(div);
    });
}

// ==========================
// COMMITS
// ==========================
function processCommits(events) {
    const data = {};

    events.forEach(e => {
        if (e.type === "PushEvent") {
            const date = e.created_at.split("T")[0];
            const count = e.payload?.commits?.length || 0;

            if (count > 0) {
                data[date] = (data[date] || 0) + count;
            }
        }
    });

    return data;
}

function displayCommitsChart(commitData) {
    const labels = Object.keys(commitData).sort();
    const data = labels.map(d => commitData[d]);

    const ctx = document.getElementById("commitChart");

    if (chartInstance) chartInstance.destroy();

    if (!labels.length) return;

    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Commits",
                data,
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59,130,246,0.2)",
                fill: true,
                tension: 0.4
            }]
        }
    });
}

// ==========================
// HEATMAP
// ==========================
function buildHeatmapDataFromCommitData(commitData) {
    const map = {};
    const today = new Date();

    for (let i = 89; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const key = d.toISOString().split("T")[0];
        map[key] = commitData[key] || 0;
    }

    return map;
}

function renderHeatmap(data) {
    const container = document.getElementById("heatmap");
    container.innerHTML = "";

    Object.entries(data).forEach(([date, count]) => {
        const cell = document.createElement("div");
        cell.className = "cell";

        cell.title = `${date}: ${count}`;

        if (count === 0) cell.style.background = "#0f172a";
        else if (count > 5) cell.style.background = "#22c55e";
        else if (count > 2) cell.style.background = "#4ade80";
        else cell.style.background = "#86efac";

        container.appendChild(cell);
    });
}

// ==========================
// STATS
// ==========================
function calculateStreak(events) {
    const activeDays = new Set();

    // collect days with activity
    events.forEach(event => {
        if (event.type === "PushEvent") {
            const date = event.created_at.split("T")[0];
            activeDays.add(date);
        }
    });

    const sortedDays = Array.from(activeDays)
        .map(d => new Date(d))
        .sort((a, b) => b - a);

    let streak = 0;
    let currentDate = new Date();

    for (let i = 0; i < sortedDays.length; i++) {
        const diff = Math.floor(
            (currentDate - sortedDays[i]) / (1000 * 60 * 60 * 24)
        );

        if (diff === streak) {
            streak++;
        } else {
            break;
        }
    }

    const streakEl = document.getElementById("streak");
    if (streakEl) {
        streakEl.textContent = streak;
    }
}
// ==========================
// WEEKLY
// ==========================
function calculateWeeklyCommits(events) {
    let count = 0;

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    events.forEach(e => {
        if (e.type === "PushEvent") {
            const d = new Date(e.created_at);
            if (d >= lastWeek) {
                count += e.payload?.commits?.length || 0;
            }
        }
    });

    document.getElementById("total").textContent = count;
}

// ==========================
// STREAK
// ==========================
function calculateWeeklyCommits(events) {
    let count = 0;

    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    events.forEach(event => {
        if (event.type === "PushEvent") {
            const eventDate = new Date(event.created_at);

            if (eventDate >= lastWeek) {
                count += event.payload?.commits?.length || 0;
            }
        }
    });

    // ✅ use streak element instead of total
    const streakEl = document.getElementById("streak");

    if (streakEl) {
        streakEl.textContent = count;
    }
}
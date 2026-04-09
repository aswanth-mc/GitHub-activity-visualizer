const params = new URLSearchParams(window.location.search);
const username = params.get('user');
let chartInstance = null;

const profile = document.querySelector('.profile');

if (!username) {
    profile.innerHTML = 'No username provided in the URL.';
} else {
    // Fetch user data from GitHub API
    fetch(`https://api.github.com/users/${username}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('user not found');
            }
            return response.json();
        })
        .then(user => {
            displayUserInfo(user);
        })
        .catch(error => {
            profile.innerHTML = error.message;
        });

    // Fetch user repositories
    fetch(`https://api.github.com/users/${username}/repos?per_page=100`)
        .then(res => res.json())
        .then(repos => {
            dispalyRepos(repos);
            calculateLanguage(repos);
        });

    // Fetch events with better handling
    fetch(`https://api.github.com/users/${username}/events/public?per_page=300`)
        .then(res => res.json())
        .then(events => {
            processCommits(events);
            generateHeatmap(events);
        })
        .catch(error => {
            console.log("Error fetching events:", error);
            // Fallback: show message
            document.getElementById("heatmap").innerHTML = '<p style="color: #94a3b8;">Limited contribution data available</p>';
        });
}

// Display user function
function displayUserInfo(user) {
    document.getElementById("avatar").src = user.avatar_url;
    document.getElementById("name").textContent = user.name || user.login;
    document.getElementById("username").textContent = "@" + user.login;
    document.getElementById("bio").textContent = user.bio || "no bio available";
    document.getElementById("repo").textContent = user.public_repos;
    document.getElementById("followers").textContent = user.followers;
    document.getElementById("following").textContent = user.following;
}

// Display repos function
function dispalyRepos(repos) {
    const repoContainer = document.querySelector('.repo');
    repoContainer.innerHTML = '<h3>Repositories:</h3>';
    repos.slice(0, 5).forEach(repo => {
        const div = document.createElement('div');
        div.innerHTML = `
    <div class="repo-header">
        <h4>${repo.name}</h4>
        <span class="lang">${repo.language || "N/A"}</span>
    </div>

    <div class="repo-stats">
        ⭐ ${repo.stargazers_count}
        🍴 ${repo.forks_count}
    </div>

    <a href="${repo.html_url}" target="_blank" class="repo-link">
        View Repo →
    </a>
`;
        repoContainer.appendChild(div);
    });
}

// Language calculation
function calculateLanguage(repos) {
    const languageCount = {};
    repos.forEach(repo => {
        const lang = repo.language;
        if (lang) {
            if (languageCount[lang]) {
                languageCount[lang]++;
            } else {
                languageCount[lang] = 1;
            }
        }
    })
    displayLanguages(languageCount);
}

// Display language function
function displayLanguages(languages) {
    const container = document.getElementById("language-list");
    container.innerHTML = "";

    const total = Object.values(languages).reduce((a, b) => a + b, 0);

    const colors = {
        "JavaScript": "#f1e05a",
        "Python": "#3572A5",
        "Java": "#b07219",
        "HTML": "#e34c26",
        "CSS": "#563d7c",
        "TypeScript": "#3178c6",
        "Go": "#00add8",
        "Rust": "#ce422b",
        "PHP": "#777bb4",
        "default": "#f34b7d",
    };
    
    Object.entries(languages).forEach(([lang, count]) => {
        const percentage = ((count / total) * 100).toFixed(2);
        const color = colors[lang] || colors["default"];
        const div = document.createElement("div");
        div.classList.add("language-item");
        div.innerHTML = `
        <div class="language-header">
            <span>${lang}</span>
            <span style="background: linear-gradient(135deg, ${color}, #fff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 600;">${percentage}%</span>
        </div>
        <div class="lang-bar">
            <div class="lang-fill" style="width:${percentage}%; background:${color}"></div>
        </div>
        `;
        container.appendChild(div);
    });
}

// Process commits - FIXED
function processCommits(events) {
    const commitData = {};

    events.forEach(event => {
        if (event.type === "PushEvent") {
            const date = event.created_at.split("T")[0];
            const commitCount = event.payload?.commits?.length || 0;

            if (commitCount > 0) {
                commitData[date] = (commitData[date] || 0) + commitCount;
            }
        }
    });

    console.log("Commit data:", commitData);
    displayCommitsChart(commitData);
}

// Display commits chart - FIXED
function displayCommitsChart(commitData) {
    const labels = Object.keys(commitData).sort();
    const data = labels.map(date => commitData[date]);

    console.log("Chart labels:", labels);
    console.log("Chart data:", data);

    const ctx = document.getElementById("commitChart");
    
    if (!ctx) {
        console.error("Canvas element not found!");
        return;
    }

    // Destroy existing chart
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Commits",
                data: data,
                fill: true,
                tension: 0.4,
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#f1f5f9',
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    padding: 10
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 11 }
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false
                    },
                    beginAtZero: true
                },
                x: {
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 11 },
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                }
            }
        }
    });
}

// Generate heatmap - IMPROVED VERSION
function generateHeatmap(events) {
    const dateMap = {};
    const today = new Date();

    // Initialize last 90 days (API limit)
    for (let i = 89; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        dateMap[dateStr] = 0;
    }

    console.log("Total events received:", events.length);

    // Count all activity types
    events.forEach(event => {
        const date = event.created_at.split("T")[0];
        let count = 0;

        if (event.type === "PushEvent") {
            count = event.payload?.commits?.length || 0;
        } else if (event.type === "PullRequestEvent") {
            count = 1;
        } else if (event.type === "IssuesEvent") {
            count = 1;
        } else if (event.type === "CreateEvent") {
            count = 1;
        } else if (event.type === "DeleteEvent") {
            count = 1;
        }

        if (count > 0 && dateMap[date] !== undefined) {
            dateMap[date] += count;
        }
    });

    console.log("Date map:", dateMap);
    renderHeatmap(dateMap);
}

function renderHeatmap(data) {
    const container = document.getElementById("heatmap");
    container.innerHTML = "";

    const dates = Object.keys(data).sort();
    const values = Object.values(data);
    const maxCount = Math.max(...values, 1);

    let totalContributions = 0;
    dates.forEach(date => {
        totalContributions += data[date];
    });

    // Add total contributions info
    const infoDiv = document.createElement("div");
    infoDiv.style.cssText = "grid-column: 1/-1; color: #94a3b8; font-size: 12px; margin-bottom: 10px;";
    infoDiv.textContent = `Total contributions (last 90 days): ${totalContributions}`;
    container.appendChild(infoDiv);

    dates.forEach(date => {
        const count = data[date];
        const cell = document.createElement("div");
        cell.classList.add("cell");

        // Add tooltip
        cell.title = `${date}: ${count} contributions`;

        // Color based on intensity
        if (count === 0) {
            cell.style.background = "#0f172a";
            cell.style.opacity = "0.3";
        } else if (count > maxCount * 0.75) {
            cell.style.background = "#22c55e";
        } else if (count > maxCount * 0.5) {
            cell.style.background = "#4ade80";
        } else if (count > maxCount * 0.25) {
            cell.style.background = "#86efac";
        } else {
            cell.style.background = "#dcfce7";
        }

        container.appendChild(cell);
    });
}
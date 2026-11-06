const params = new URLSearchParams(window.location.search);
const username = params.get('user');
let chartInstance = null;

const profile = document.querySelector('.profile');
const commitStatus = document.getElementById("commit-status");

async function fetchGitHubJson(url) {
    const response = await fetch(url);
    let data;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const error = new Error(data?.message || `GitHub API request failed (${response.status}).`);
        error.status = response.status;
        error.rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        error.rateLimitReset = response.headers.get('x-ratelimit-reset');
        throw error;
    }

    return data;
}

function describeApiError(error) {
    if (error.status === 403 && error.rateLimitRemaining === '0') {
        const resetTime = error.rateLimitReset
            ? ` Try again after ${new Date(Number(error.rateLimitReset) * 1000).toLocaleTimeString()}.`
            : '';
        return `GitHub API rate limit reached.${resetTime} ${error.message}`;
    }

    return error.status === 403
        ? `GitHub API access denied (403). ${error.message}`
        : error.message;
}

if (!username) {
    profile.innerHTML = 'No username provided in the URL.';
} else {
    // Fetch user data from GitHub API
    fetchGitHubJson(`https://api.github.com/users/${encodeURIComponent(username)}`)
        .then(user => {
            displayUserInfo(user);
        })
        .catch(error => {
            profile.textContent = `Could not load profile: ${describeApiError(error)}`;
        });

    // Fetch user repositories
    fetchGitHubJson(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100`)
        .then(repos => {
            if (!Array.isArray(repos)) {
                throw new Error('GitHub returned an unexpected repositories response.');
            }
            dispalyRepos(repos);
            calculateLanguage(repos);
        })
        .catch(error => {
            const repoContainer = document.querySelector('.repo');
            repoContainer.innerHTML = '<h3>Repositories</h3><p></p>';
            repoContainer.querySelector('p').textContent = `Could not load repositories: ${describeApiError(error)}`;
            document.getElementById('language-list').textContent = 'Languages are unavailable.';
        });

    // Fetch events with better handling
    fetchGitHubJson(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=300`)
        .then(events => {
            if (!Array.isArray(events)) {
                throw new Error("GitHub events payload is not a list.");
            }
            generateHeatmap(events);

            const eventCommitData = processCommits(events);
            if (Object.keys(eventCommitData).length === 0) {
                if (commitStatus) {
                    commitStatus.textContent = "No PushEvent data found. Trying repository commit history...";
                }
                return fetchCommitsFromRepos(username).then(repoCommitData => {
                    if (Object.keys(repoCommitData).length === 0) {
                        if (commitStatus) {
                            commitStatus.textContent = "No recent commits found in public events or recent repositories.";
                        }
                        displayCommitsChart({});
                        renderHeatmap(buildHeatmapDataFromCommitData({}));
                        return;
                    }
                    if (commitStatus) {
                        commitStatus.textContent = "Showing commits from repository history fallback.";
                    }
                    displayCommitsChart(repoCommitData);
                    renderHeatmap(buildHeatmapDataFromCommitData(repoCommitData));
                });
            }
            displayCommitsChart(eventCommitData);
        })
        .catch(error => {
            console.warn("Error fetching events:", error);
            if (commitStatus) {
                commitStatus.textContent = `Unable to load commit chart: ${describeApiError(error)}`;
            }
            const fallbackMap = buildHeatmapDataFromCommitData({});
            renderHeatmap(fallbackMap);
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
    if (!Array.isArray(repos) || repos.length === 0) {
        repoContainer.innerHTML = '<h3>Repositories</h3><p>No repositories found.</p>';
        return;
    }

    const sortedRepos = [...repos].sort((a, b) => {
        const aActivity = new Date(a.pushed_at || a.updated_at || 0).getTime();
        const bActivity = new Date(b.pushed_at || b.updated_at || 0).getTime();
        return bActivity - aActivity;
    });

    repoContainer.innerHTML = `
        <div class="repo-title-row">
            <h3>Repositories</h3>
            <span class="repo-total">${sortedRepos.length} total</span>
        </div>
        <div class="repo-list"></div>
    `;

    const repoList = repoContainer.querySelector('.repo-list');

    sortedRepos.forEach((repo, index) => {
        const div = document.createElement('div');
        div.className = 'repo-card';
        const isFork = repo.fork;
        const latestActivity = repo.pushed_at || repo.updated_at;
        const activityText = latestActivity ? new Date(latestActivity).toLocaleDateString() : "N/A";
        div.innerHTML = `
    <div class="repo-header">
        <h4>${repo.name}</h4>
        <div class="repo-badges">
            ${index === 0 ? '<span class="tag active-tag">Most Active</span>' : ''}
            ${isFork ? '<span class="tag fork-tag">Forked</span>' : ''}
            <span class="lang">${repo.language || "N/A"}</span>
        </div>
    </div>

    <div class="repo-stats">
        ⭐ ${repo.stargazers_count}
        🍴 ${repo.forks_count}
    </div>
    <div class="repo-activity">Last activity: ${activityText}</div>

    <a href="${repo.html_url}" target="_blank" class="repo-link">
        View Repo →
    </a>
`;
        repoList.appendChild(div);
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

    if (total === 0) {
        container.innerHTML = '<p style="color: #94a3b8; font-size: 0.88rem; margin: 0;">No language data available.</p>';
        return;
    }

    const colors = {
        "JavaScript": "#f1e05a",
        "TypeScript": "#3178c6",
        "Python": "#3572A5",
        "Java": "#b07219",
        "HTML": "#e34c26",
        "CSS": "#563d7c",
        "C": "#555555",
        "C++": "#f34b7d",
        "C#": "#178600",
        "Go": "#00add8",
        "Rust": "#dea584",
        "PHP": "#4F5D95",
        "Ruby": "#701516",
        "Swift": "#F05138",
        "Kotlin": "#A97BFF",
        "Shell": "#89e051",
        "Vue": "#41b883",
        "default": "#38bdf8",
    };
    
    // Sort languages descending by count
    const sortedLanguages = Object.entries(languages).sort((a, b) => b[1] - a[1]);

    sortedLanguages.forEach(([lang, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        const color = colors[lang] || colors["default"];
        const div = document.createElement("div");
        div.classList.add("language-item");
        div.innerHTML = `
        <div class="language-header">
            <span>${lang}</span>
            <span style="color: ${color}; font-weight: 600;">${percentage}%</span>
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
    return commitData;
}

async function fetchCommitsFromRepos(username) {
    const commitData = {};
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 90);
    const sinceISO = sinceDate.toISOString();

    try {
        const repoResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=8`);
        if (!repoResponse.ok) {
            return commitData;
        }

        const repos = await repoResponse.json();
        if (!Array.isArray(repos)) {
            return commitData;
        }

        const recentRepos = repos.filter(repo => !repo.fork).slice(0, 6);

        await Promise.all(recentRepos.map(async repo => {
            try {
                const commitsUrl = `https://api.github.com/repos/${repo.full_name}/commits?author=${username}&since=${encodeURIComponent(sinceISO)}&per_page=100`;
                const commitResponse = await fetch(commitsUrl);
                if (!commitResponse.ok) {
                    return;
                }

                const commits = await commitResponse.json();
                if (!Array.isArray(commits)) {
                    return;
                }

                commits.forEach(commit => {
                    const date = commit?.commit?.author?.date?.split("T")[0];
                    if (date) {
                        commitData[date] = (commitData[date] || 0) + 1;
                    }
                });
            } catch (error) {
                console.log("Repo commit fallback error:", error);
            }
        }));
    } catch (error) {
        console.log("Fallback repository fetch error:", error);
    }

    return commitData;
}

// Display commits chart - FIXED
function displayCommitsChart(commitData) {
    const labels = Object.keys(commitData).sort();
    const data = labels.map(date => commitData[date]);

    console.log("Chart labels:", labels);
    console.log("Chart data:", data);

    const ctx = document.getElementById("commitChart");
    const chartAvailable = typeof Chart !== "undefined";
    
    if (!ctx) {
        console.error("Canvas element not found!");
        return;
    }

    if (!chartAvailable) {
        if (commitStatus) {
            commitStatus.textContent = "Chart library failed to load. Check internet/CDN access.";
        }
        return;
    }

    if (labels.length === 0) {
        if (commitStatus) {
            commitStatus.textContent = "No recent commits found for chart data.";
        }
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        return;
    }

    if (commitStatus) {
        commitStatus.textContent = "";
    }

    // Destroy existing chart
    if (chartInstance) {
        chartInstance.destroy();
    }

    try {
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
    } catch (error) {
        if (commitStatus) {
            commitStatus.textContent = "Chart failed to render due to a runtime error.";
        }
        console.error(error);
    }
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

function buildHeatmapDataFromCommitData(commitData) {
    const dateMap = {};
    const today = new Date();

    for (let i = 89; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        dateMap[dateStr] = commitData[dateStr] || 0;
    }

    return dateMap;
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
    infoDiv.className = "heatmap-info";
    infoDiv.textContent = `Total contributions (last 90 days): ${totalContributions}`;
    container.appendChild(infoDiv);

    // Grid container for cells
    const gridDiv = document.createElement("div");
    gridDiv.className = "heatmap-grid";

    dates.forEach(date => {
        const count = data[date];
        const cell = document.createElement("div");
        cell.classList.add("cell");

        // Add tooltip
        cell.title = `${date}: ${count} contribution${count === 1 ? '' : 's'}`;

        // Color based on intensity
        if (count > 0) {
            if (count > maxCount * 0.75) {
                cell.style.background = "#22c55e";
                cell.style.borderColor = "rgba(34, 197, 94, 0.4)";
            } else if (count > maxCount * 0.5) {
                cell.style.background = "#4ade80";
                cell.style.borderColor = "rgba(74, 222, 128, 0.4)";
            } else if (count > maxCount * 0.25) {
                cell.style.background = "#86efac";
                cell.style.borderColor = "rgba(134, 239, 172, 0.4)";
            } else {
                cell.style.background = "#bbf7d0";
                cell.style.borderColor = "rgba(187, 247, 208, 0.4)";
            }
        }

        gridDiv.appendChild(cell);
    });

    container.appendChild(gridDiv);
}
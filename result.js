const params = new URLSearchParams(window.location.search);
const username = params.get('user');

const profile=document.querySelector('.profile');

if (!username) {
    profile.innerHTML = 'No username provided in the URL.';
}
else {//

    //fetch user data from GitHub API
    fetch(`https://api.github.com/users/${username}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('user not found');
            }
            return response.json();
        })
        .then(user=>{
            displayUserInfo(user);
        })
        .catch(error => {
            profile.innerHTML = error.message;
        });

        //fetch user repositories
        fetch(`https://api.github.com/users/${username}/repos`)
        .then(res => res.json())
        .then(repos => {
            dispalyRepos(repos);
            calculateLanguage(repos);
        });

        //fetch events
        fetch(`https://api.github.com/users/${username}/events`)
        .then(res => res.json())
        .then(events => {
            processCommits(events);
            generateHeatmap(events);
        });

        

}
        
// display user function
function displayUserInfo(user) {
    document.getElementById("avatar").src = user.avatar_url;
    document.getElementById("name").textContent = user.name || user.login;
    document.getElementById("username").textContent = "@" + user.login;
    document.getElementById("bio").textContent = user.bio || "no bio available";
    document.getElementById("repo").textContent = user.public_repos;
    document.getElementById("followers").textContent = user.followers;
    document.getElementById("following").textContent = user.following;
    document.getElementById("followers").textContent = "Followers: " + user.followers;
    document.getElementById("following").textContent = "Following: " + user.following;
}

// display repos function
function dispalyRepos(repos){
    const repoContainer=document.querySelector('.repo');
    repoContainer.innerHTML='<h3>Repositories:</h3>';
    repos.slice(0,5).forEach(repo => {
        const div=document.createElement('div');
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

// language calculation
function calculateLanguage(repos){
    const languageCount={};
    repos.forEach(repo =>{
        const lang=repo.language;
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

//display language function
function displayLanguages(languages) {
    const container=document.getElementById("language-list");
    container.innerHTML="";

    const total = Object.values(languages).reduce((a,b) => a+b,0);

    const colors ={
        "JavaScript": "#f1e05a",
        "Python": "#3572A5",
        "Java": "#b07219",
        "HTML": "#e34c26",
        "CSS": "#563d7c",
        "default": "#f34b7d",

    };
    Object.entries(languages).forEach(([lang,count]) =>{
        const percentage = ((count / total) * 100).toFixed(2);
        const color = colors[lang] || colors["default"];
        const div=document.createElement("div");
        div.classList.add("language-item");
        div.innerHTML=`
        <div class="language-header">
            <span>${lang}</span>
            <span>${percentage}%</span>
        </div>
        <div class="lang-bar">
                <div class="lang-fill" style="width:${percentage}%; background:${color}"></div>
            </div>
        `;
        container.appendChild(div);
    });

}

// process commits function
function processCommits(events) {
    const commitData = {};

    events.forEach(event => {
        if (event.type === "PushEvent") {

            const date = event.created_at.split("T")[0];
            const commitCount = event.payload?.commits?.length || 0;

            if (commitCount === 0) return;

            if (commitData[date]) {
                commitData[date] += commitCount;
            } else {
                commitData[date] = commitCount;
            }
        }
    });

    displayCommitsChart(commitData);
}
function displayCommitsChart(commitData) {
    const labels = Object.keys(commitData);
    const data = Object.values(commitData);

    const ctx = document.getElementById("commitChart");

    new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Commits",
                data: data,
                fill: false,
                tension: 0.3
            }]
        },
        options: {
            responsive: true
        }
    });
}

// generate heatmap function
function generateHeatmap(events) {
    const dateMap = {};

    events.forEach(event => {
        if (event.type === "PushEvent") {

            const date = event.created_at.split("T")[0];
            const count = event.payload?.commits?.length || 0;

            if (count === 0) return;

            if (dateMap[date]) {
                dateMap[date] += count;
            } else {
                dateMap[date] = count;
            }
        }
    });

    renderHeatmap(dateMap);
}

function renderHeatmap(data) {
    const container = document.getElementById("heatmap");
    container.innerHTML = "";

    const dates = Object.keys(data);

    dates.forEach(date => {
        const count = data[date];

        const cell = document.createElement("div");
        cell.classList.add("cell");

        // color intensity
        if (count > 5) {
            cell.style.background = "#22c55e"; 
        } else if (count > 2) {
            cell.style.background = "#4ade80";
        } else if (count > 0) {
            cell.style.background = "#86efac";
        }

        container.appendChild(cell);
    });
}
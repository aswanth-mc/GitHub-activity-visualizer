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
    document.getElementById("avatar").src=user.avatar_url;
    document.getElementById("name").textContent=user.name ||user.login;
    document.getElementById("bio").textContent=user.bio ||"no bio available";
    document.getElementById("repo").textContent="Public Repositories: "+user.public_repos;
    document.getElementById("followers").textContent="Followers: "+user.followers;
    document.getElementById("following").textContent="Following: "+user.following;
}

// display repos function
function dispalyRepos(repos){
    const repoContainer=document.querySelector('.repo');
    repoContainer.innerHTML='<h3>Repositories:</h3>';
    repos.slice(0,5).forEach(repo => {
        const div=document.createElement('div');
        div.innerHTML=
        `<p><strong>${repo.name}</strong></p>
        <p>⭐ Stars: ${repo.stargazers_count}</p>

        `;
        repoContainer.appendChild(div);
    });
}

// language calculation
function calculateLanguage(repos){
    const languageCount={};
    repos.forEach(repo =>{
        const lang=repo.language;
        if(languageCount[lang]){
            languageCount[lang]++;
        }
        else{
            languageCount[lang]=1;
        }
    })
    displayLanguages(languageCount);
}

//display language function
function displayLanguages(languages) {
    const labels = Object.keys(languages);
    const data = Object.values(languages);

    const ctx = document.getElementById("langChart");

    new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Languages Used",
                data: data
            }]
        },
        options: {
            responsive: true
        }
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
    const dateMap ={};
    if (events.type === "PushEvent") {
        const date = events.created_at.split("T")[0];
        const count = events.payload?.commits?.length || 0;

        if (dateMap[date]) {
            dateMap[date] += count;
        } else {
            dateMap[date] = count;
        }   
    }
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
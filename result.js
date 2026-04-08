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
    displayLanguage(languageCount);
}

//display language function
function displayLanguage(languageCount){
    const languageContainer=document.querySelector('.languages');
    languageContainer.innerHTML='<h3>Languages:</h3>';
    
    const sorted = Object.entries(languageCount)
    .sort((a, b) => b[1] - a[1]);

    sorted.forEach(([lang, count]) => {
        const div = document.createElement('div');
        div.textContent = `${lang}: ${count}`;
        languageContainer.appendChild(div);
    });
}
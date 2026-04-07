const params = new URLSearchParams(window.location.search);
const username = params.get('user');

const profile=document.querySelector('.profile');

if (!username) {
    profile.innerHTML = 'No username provided in the URL.';
}
else {
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
}

function displayUserInfo(user) {
    document.getElementById("avatar").src=user.avatar_url;
    document.getElementById("name").textContent=user.name ||user.login;
    document.getElementById("bio").textContent=user.bio ||"no bio available";
    document.getElementById("repo").textContent="Public Repositories: "+user.public_repos;
    document.getElementById("followers").textContent="Followers: "+user.followers;
    document.getElementById("following").textContent="Following: "+user.following;
}
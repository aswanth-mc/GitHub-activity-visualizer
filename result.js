const params = new URLSearchParams(window.location.search);
const username = params.get('user');

if (!username) {
    card.innerHTML = "no username provided";
}
else{
    fetch(`https://api.github.com/users/${username}`)
    .then(response => {
        if (!response.ok) {
            throw new Error('User not found');
        }
        return response.json();
    })
    .then(data => {
        displayUserInfo(data);
    })
    .catch(error => {
        card.innerHTML = error.message;
    });
}

function displayUserInfo(user) {
    const card = document.querySelector('.card');
    card.innerHTML = `
        <img src="${user.avatar_url}" alt="${user.login}'s avatar">
        <h2>${user.name || user.login}</h2>
        <p>${user.bio || 'No bio available'}</p>
        <p>Public Repositories: ${user.public_repos}</p>
        <p>Followers: ${user.followers}</p>
        <p>Following: ${user.following}</p>
    `;
}
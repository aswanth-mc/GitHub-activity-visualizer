const input = document.querySelector('.input');
const button = document.querySelector('.button');
const card = document.querySelector('.card');

button.addEventListener('click', () => {
    const username = input.value.trim();
    if (username === '') {
        alert('Please enter a GitHub username.');
        return;
    }

    fetch(`https://api.github.com/users/${username}`)
        .then(res =>) {
            throw new Error('User not found');
        }
        return res.json();
        })
        .then(data => {
            displayUserData(data);
        })
        .catch(error => {
            card
        });
    // Proceed with fetching user data
function displayUser(user) {
    card.innerHTML = `
        <img src="${user.avatar_url}" width="100">
        <h2>${user.name}</h2>
        <p>@${user.login}</p>
        <p>Repos: ${user.public_repos}</p>
        <p>Followers: ${user.followers}</p>
    `;
}
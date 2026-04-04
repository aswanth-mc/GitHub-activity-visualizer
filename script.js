const input = document.querySelector('.input');
const button = document.querySelector('.btn');
const card = document.querySelector('.card');

button.addEventListener('click', () => {
    const username = input.value.trim();
    if (username === '') {
        alert('Please enter a GitHub username.');
        return;
    }

    fetch(`https://api.github.com/users/${username}`)
        .then(res => {
            if (!res.ok) {
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
function displayUserData(data) {
    card.innerHTML = `
        <img src="${data.avatar_url}" width="100">
        <h2>${data.name}</h2>
        <p>@${data.login}</p>
        <p>Repos: ${data.public_repos}</p>
        <p>Followers: ${data.followers}</p>
    `;
}
});

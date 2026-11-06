let input = document.querySelector('#input');
let searchBtn = document.querySelector('#search-btn');

function searchUser() {
    const username = input.value.trim();

    if (username === '') {
        alert('Please enter a GitHub username');
        return;
    }

    window.location.href = `dashboard.html?user=${encodeURIComponent(username)}`;
}

searchBtn.addEventListener('click', searchUser);
input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        searchUser();
    }
});
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
    document.getElementById()
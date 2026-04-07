let input = document.querySelector('#input');
let searchBtn = document.querySelector('#search-btn');

searchBtn.addEventListener('click',()=>{
    const username = input.value.trim();

    if username === '' {
        alert('Please enter a GitHub username');
        return;
    }

    window.location.href = `results.html?user=${username}`;
})
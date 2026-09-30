
const elements = Array.from(document.querySelectorAll('*')).filter(el => el.textContent && el.textContent.includes('步骤 3/3'));
console.log('COUNT:', elements.length);
elements.forEach((el, i) => {
    console.log(`EL_${i}: tag=${el.tagName} id=${el.id} class=${el.className.slice(0, 50)} rect=${JSON.stringify(el.getBoundingClientRect())}`);
});

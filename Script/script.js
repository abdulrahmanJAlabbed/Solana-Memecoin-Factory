
document.addEventListener('DOMContentLoaded', function() {
  // Animate hero banner
  const hero = document.querySelector('.hero-banner');
  setTimeout(() => hero.classList.add('animate-on-load'), 300);

  // Animate form container
  const form = document.querySelector('.form-container');
  setTimeout(() => form.classList.add('animate-on-load'), 600);

  // Animate cards with staggered delays
  const cards = document.querySelectorAll('.card');
  cards.forEach((card, index) => {
    setTimeout(() => card.classList.add('animate-on-load'), 1000 + (index * 100));
  });
});

// Animate faq items preview
document.querySelectorAll('.faq-item').forEach((item, index) => {
  setTimeout(() => item.classList.add('animate-on-load'), 1800 + (index * 100));
});

// FAQ accordion functionality   
document.querySelectorAll('.faq-item').forEach(item => {     
  item.addEventListener('click', () => {       
    item.classList.toggle('active');     
    });   
});

function toggleExpand() {
  const expandedOptions = document.getElementById('expandedOptions');
  expandedOptions.style.display = expandedOptions.style.display === 'none' ? 'block' : 'none';
}


document.addEventListener("DOMContentLoaded", () => {
  const modelViewer = document.querySelector("model-viewer");
  const orbit = document.querySelector(".orbits");
  orbit.style.display = "none";

  // Ensure the model is initially invisible and positioned at the top
  modelViewer.style.opacity = "0";
  modelViewer.style.transform = "translateY(-100%)"; // Start above the viewport
  modelViewer.style.transition = "opacity 1s, transform 1s"; // Smooth transition for opacity and position

  // Delay the start of the animation by 9 seconds
  setTimeout(() => {
    // Apply a smooth fade-in and move the model down after load
    modelViewer.style.opacity = "1"; // Fade in the model
    modelViewer.style.transform = "translateY(0)"; // Move to its normal position

    // Start spinning with high speed
    let rotationSpeed = 700; // Initial high rotation speed (in degrees per second)
    modelViewer.setAttribute("rotation-per-second", `${rotationSpeed}deg`);

    // Gradually slow down the rotation over 2.5 seconds
    const slowdownDuration = 2500; // 2.5 seconds
    const targetSpeed = 50; // Final slow speed
    const step = (rotationSpeed - targetSpeed) / (slowdownDuration / 50); // Calculate gradual decrease

    let interval = setInterval(() => {
      if (rotationSpeed > targetSpeed) {
        rotationSpeed -= step; // Decrease the rotation speed
        modelViewer.setAttribute("rotation-per-second", `${rotationSpeed}deg`);
      } else {
        clearInterval(interval); // Stop when the target speed is reached
        orbit.style.display = "flex"; // Make the orbit visible
      }
    }, 50); // Update every 50ms to create smooth effect

  }, 1500); // Delay the animation start by 9 seconds
});


(function () {
    emailjs.init("N9kf-ZYRoWAiH2kWq"); // Replace with your EmailJS public key
})();

// Function to handle form submission
function sendEmail(event) {
    event.preventDefault(); // Prevent the default form submission behavior

    // Get form data
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const message = document.getElementById("message").value;
    const category = document.getElementById("category").value;

    // Send the email using EmailJS
    emailjs
        .send("service_365k1gl", "template_j4i3xba", {
            name: name ? name : "anonymous",
            email: email ? email : "anonymous@anon.com",
            message: `Category: ${category}.\n` + message,
            receiver: "Henry Ihenacho",
        })
        .then(
            function () {
                alert("Thank you for your feedback! We appreciate your input.");
                document.getElementById("feedback-form").reset(); // Clear the form
            },
            function (error) {
                alert("Oops! Something went wrong: " + error.text);
            }
        );
}

// Attach the event listener to the form
document.getElementById("feedback-form").addEventListener("submit", sendEmail);

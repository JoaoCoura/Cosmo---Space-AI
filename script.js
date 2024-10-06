const typingForm = document.querySelector(".typing-form");
const chatList = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion-list .suggestion");
const toggleThemeButton = document.querySelector("#toggle-theme-button");
const deleteChatButton = document.querySelector("#delete-chat-button");


let userMessage = null;
let isResponseGenerating = false;
const chatHistory = []; // Array for the ChatHistory

// API configuration
const API_KEY = "AIzaSyD9kNtWWmosCMN1dSO1FmDgg5y5KfvNkjY"; // Will be deleted to avoid problems
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`;

const loadLocalstorageData = () => {
    const savedChats = localStorage.getItem("savedChats");
    const isLightMode = (localStorage.getItem("themeColor") === "light_mode");

    // Apply the stored theme
    document.body.classList.toggle("light_mode", isLightMode);
    toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

    //Restore saved chats
    chatList.innerHTML = savedChats || "";

    document.body.classList.toggle("hide-header", savedChats);
    chatList.scrollTo(0, chatList.scrollHeight); // Scroll to bottom
}

loadLocalstorageData();

// Create a new message element and return it
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

// Show typing effect by displaying words one by one
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
    const words = text.split(' ');
    let currentWordIndex = 0;

    const typingInterval = setInterval(() => {
        // Append each word to the text element with a space
        textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
        incomingMessageDiv.querySelector(".icon").classList.add("hide");

        // If all words are displayed
        if (currentWordIndex === words.length) {
            clearInterval(typingInterval);
            isResponseGenerating = false;
            incomingMessageDiv.querySelector(".icon").classList.remove("hide");
            localStorage.setItem("savedChats", chatList.innerHTML) // Save chats to local storage
        }
        chatList.scrollTo(0, chatList.scrollHeight); // Scroll to bottom
    }, 75);
}

// Fetch response from the API based on user message
const generateAPIResponse = async (incomingMessageDiv) => {
    const textElement = incomingMessageDiv.querySelector(".text"); // Get text element

    // Prepare the prompt by concatenating the history of messages
    const historyPrompt = chatHistory.map(msg => `${msg.type === 'user' ? 'User' : 'Cosmo'}: ${msg.content}`).join('\n');
    const prompt = `You are Cosmo, NASA's friendly virtual assistant, trained to help students and answer questions in natural language about exoplanets and other astronomy-related topics using reliable NASA sources. Stay focused on astronomy-related topics only, and encourage users to visit NASA's official website (https://science.nasa.gov/exoplanets/) when additional information is required.\nThis is the conversation history: ${historyPrompt}\nThis is the user's new message: ${userMessage}. Don't start your message with "Cosmo:"`;

    // Send a POST request to the API with the user's message
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        if(!response.ok) throw new Error(data.error.message);

        // Get the API response text and remove asterisks from it
        const apiResponse = data?.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
        showTypingEffect(apiResponse, textElement, incomingMessageDiv);

        // Add answer to history
        chatHistory.push({ type: 'Cosmo', content: apiResponse });
    } catch (error) {
        isResponseGenerating = false;
        textElement.innerText = error.message;
        textElement.classList.add("error");
    } finally {
        incomingMessageDiv.classList.remove("loading");
    }
}

// Show loading animation while waiting for API response
const showLoadingAnimation = () => {
    const html = '<div class="message-content"><img src="./Images/Cosmo.png" alt="Cosmo Image" class="avatar"><p class="text"></p><div class="loading-indicator"><div class="loading-bar"></div><div class="loading-bar"></div><div class="loading-bar"></div></div></div><span onclick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>';

    const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
    chatList.appendChild(incomingMessageDiv);

    chatList.scrollTo(0, chatList.scrollHeight); // Scroll to bottom
    generateAPIResponse(incomingMessageDiv);
}

// Copy message text to the clipboard
const copyMessage = (copyIcon) => {
    const messageText = copyIcon.parentElement.querySelector(".text").innerText;
    navigator.clipboard.writeText(messageText);
    copyIcon.innerText = "done"; // Show tick icon
    setTimeout(() => copyIcon.innerText = "done", "content_copy", 1000) // Revert icon after 1 second
}

const handleOutgoingChat = () => {
    userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
    if (!userMessage || isResponseGenerating) return; // Exit if there is no message

    isResponseGenerating = true;

    const html = '<div class="message-content"><img src="./Images/User.png" alt="User Image" class="avatar"><p class="text"></p></div>';

    const outgoingMessageDiv = createMessageElement(html, "outgoing");
    outgoingMessageDiv.querySelector(".text").innerText = userMessage;
    chatList.appendChild(outgoingMessageDiv);

    // Add user's message to history
    chatHistory.push({ type: 'user', content: userMessage });

    typingForm.reset(); // Clear input field
    chatList.scrollTo(0, chatList.scrollHeight); // Scroll to bottom
    document.body.classList.add("hide-header"); //Hide header once chat starts
    setTimeout(showLoadingAnimation, 500); // Show loading animation after a delay
}

// Set userMessage and handle outgoing chat when a suggestion is clicked
suggestions.forEach(suggestion => {
    suggestion.addEventListener("click", () => {
        userMessage = suggestion.querySelector(".text").innerText;
        handleOutgoingChat();
    });
});

// Toggle between light and dark themes
toggleThemeButton.addEventListener("click", () =>{
    const isLightMode = document.body.classList.toggle("light_mode");
    localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode")
    toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

// Delete all chats from local storage when button is clicked
deleteChatButton.addEventListener("click", () => {
    if(confirm("Are you sure you want to delete all messages?")) {
        localStorage.removeItem("savedChats");
        loadLocalstorageData();
        chatHistory.length = 0;
    }
})

// Prevent default form submission and handle outgoing chat
typingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleOutgoingChat();
});

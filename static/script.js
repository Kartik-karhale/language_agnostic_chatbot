document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("user-input").addEventListener("keypress", function(e) {
    if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
    const input = document.getElementById("user-input");
    const message = input.value.trim();
    if (!message) return;

    addMessage(message, "user-msg");
    input.value = "";

    const chatBox = document.getElementById("chat-box");
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });
        const data = await res.json();
        addMessage(data.reply, "bot-msg");
    } catch (err) {
        addMessage("⚠️ Error: Could not connect to server.", "bot-msg");
    }
}

function addMessage(text, className) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "message " + className;
    msgDiv.textContent = text;
    document.getElementById("chat-box").appendChild(msgDiv);
}

// 同期送信
function submitSync(argSubmit) {
    const form = document.getElementById("syncForm");
    form.action = argSubmit;
    form.method = "POST";
    form.submit();
}
// 非同期送信
async function submitAsync(argSubmit) {
    const form = document.getElementById("asyncForm");
    const name = form.elements.name.value.trim();
    const resultDiv = document.getElementById("asyncResult");
    resultDiv.textContent = "送信中";

    try {
        const action = argSubmit;

        const response = await fetch(argSubmit, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });

        if (!response.ok) {
            const errorData = await response.json();
            resultDiv.innerHTML = `<span class="error">${errorData.error}</span>`;
            return;
        }

        const data = await response.json();
        resultDiv.textContent = data.message;
    } catch (err) {
        resultDiv.innerHTML = `<span class="error">通信エラーが発生しました</span>`;
    }

}
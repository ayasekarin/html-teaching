//--------------------------------------------------------------
// 作成者：syu
//--------------------------------------------------------------

function startProductSearch() {
    const area = document.getElementById("searchResultArea");
    area.innerHTML = "<div class='text-muted'>検索中...</div>";

    setTimeout(() => {
        let html = "";
        for (let i = 1; i <= 5; i++) {
            const item = {
                name: `未来を仕掛けるノートPC ${i}`,
                code: `JAST-${i}`,
                maker: "日本システム技術",
                stock: 10 + i
            };
            html += `
        <div class="card p-2 mb-2 shadow-sm">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div><strong>${item.name}</strong></div>
              <div><small class="text-muted">型番：${item.code} ／ メーカー：${item.maker} ／ 在庫：${item.stock}</small></div>
            </div>
            <button class="btn btn-sm btn-outline-primary" onclick="showDetailModal()">編集</button>
          </div>
        </div>`;
        }
        area.innerHTML = html;
    }, 1000);
}


function showDetailModal() {
    const detailModal = new bootstrap.Modal(document.getElementById("productDetailModal"));
    detailModal.show();
}

function closeDetailModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById("productDetailModal"));
    modal.hide();
}

function closeSearchModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById("productSearchModal"));
    modal.hide();
}

function confirmProductEdit() {
    alert("※非同期未実装");
    closeDetailModal();
}

// 新規発注ボタン押下
document.addEventListener("DOMContentLoaded", () => {
    const body = document.querySelector("#newOrderModal .modal-body");
    const searchBtn = document.createElement("button");
    searchBtn.textContent = "商品検索";
    searchBtn.className = "btn btn-outline-danger btn-sm mb-3";
    searchBtn.onclick = () => {
        const searchModal = new bootstrap.Modal(document.getElementById("productSearchModal"));
        searchModal.show();
    };
    body.insertBefore(searchBtn, body.querySelector("h6"));
});

function addEditProductRow() {
    const row = `
    <div class="row g-2 mb-2">
      <div class="col-md-5"><input type="text" class="form-control" placeholder="商品名"></div>
      <div class="col-md-2"><input type="number" class="form-control" placeholder="数量" value="1"></div>
      <div class="col-md-3"><input type="number" class="form-control" placeholder="単価" value="0"></div>
      <div class="col-md-2"><button class="btn btn-danger w-100" onclick="removeProductRow(this)">削除</button></div>
    </div>`;
    document.getElementById("editProductList").insertAdjacentHTML("beforeend", row);
}

function addProductRow() {
    const row = `
    <div class="row g-2 mb-2">
      <div class="col-md-5"><input type="text" class="form-control" placeholder="商品名"></div>
      <div class="col-md-2"><input type="number" class="form-control" placeholder="数量" value="1"></div>
      <div class="col-md-3"><input type="number" class="form-control" placeholder="単価" value="0"></div>
      <div class="col-md-2"><button class="btn btn-danger w-100" onclick="removeProductRow(this)">削除</button></div>
    </div>`;
    document.getElementById("productList").insertAdjacentHTML("beforeend", row);
}

function removeProductRow(btn) {
    btn.closest(".row").remove();
}

function submitOrder() {
    const user = document.getElementById("orderUser").value.trim();
    const products = document.querySelectorAll("#productList input[placeholder='商品名']");
    let hasProduct = false;
    products.forEach(p => { if (p.value.trim()) hasProduct = true; });
    if (!user || !hasProduct) {
        document.getElementById("orderWarning").classList.remove("d-none");
        return;
    }
    alert("登録完了！（※実際の登録処理は未実装）");
    const modal = bootstrap.Modal.getInstance(document.getElementById("newOrderModal"));
    modal.hide();
}

// 編集ボタン動き
document.querySelectorAll("button.hensyu").forEach(btn => {
    btn.setAttribute("data-bs-toggle", "modal");
    btn.setAttribute("data-bs-target", "#editOrderModal");
});

//--------------------------------------------------------------
// セキュリティ対策
//--------------------------------------------------------------
document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('keydown', function (event) {
    if (
        event.key === 'F12' ||
        (event.ctrlKey && event.shiftKey && event.key === 'I') ||
        (event.ctrlKey && event.key === 'U')
    ) {
        event.preventDefault();
    }
});
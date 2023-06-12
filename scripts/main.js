import { attTables, executa_ciclo, toogleFlag } from "./simulador.js"
let flag = false

window.addEventListener("DOMContentLoaded", attTables)

function acabou() {
    var mensagem = "Programa finalizado! Clique em OK para executar a função";

    var result = confirm(mensagem);

    if (result) {
    executarFuncao();
    }
}

function executarFuncao() {
    location.reload();
  }

document.getElementById("next-button").addEventListener("click", () => {
    const fim = executa_ciclo();
    flag ? acabou() : attTables();
    if(fim) flag = true
});

document.getElementById("swtch").addEventListener("click", toogleFlag)
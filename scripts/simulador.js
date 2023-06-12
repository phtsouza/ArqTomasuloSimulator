import { instrucoes } from "./instrucoes.js";

class Config {
    constructor() {
        this.numInstrucoes = instrucoes.length
        this.ciclos = { Add: "1", Desvio: "1", Div: "15", Load: "2", Mult: "1", Store: "2" }
        this.unidades = { Add: "3", Desvio: "2", Mult: "2" }
        this.unidadesMem = { Load: "2", Store: "3" }
    }
}

class ReorderBuffer {
    estadoInstrucoes = []
    constructor(numInstrucoes) {
        for (let i = 0; i < numInstrucoes; i++) {
            let linha = {};
            linha['instrucao'] = {
                operacao: instrucoes[i]['nome'],
                registradorR: instrucoes[i]['r'],
                registradorS: instrucoes[i]['s'],
                registradorT: instrucoes[i]['t'],
            };

            linha['posicao'] = i;
            linha['issue'] = null;
            linha['exeCompleta'] = null;
            linha['write'] = null;
            linha['busy'] = false;
            this.estadoInstrucoes[i] = linha;
        }
    }
}

class ReservationStation {
    unidadesFuncionais = {}
    constructor(CONFIG) {
        for (var tipoUnidade in CONFIG['unidades']) {
            for (let i = 0; i < CONFIG['unidades'][tipoUnidade]; i++) {
                let unidadeFuncional = {};
                unidadeFuncional['instrucao'] = null;
                unidadeFuncional['estadoInstrucao'] = null;
                unidadeFuncional['tipoUnidade'] = tipoUnidade;
                unidadeFuncional['tempo'] = null;

                let nome = tipoUnidade + (i + 1);
                unidadeFuncional['nome'] = nome;
                unidadeFuncional['ocupado'] = false;

                unidadeFuncional['operacao'] = null;
                unidadeFuncional['vj'] = null;
                unidadeFuncional['vk'] = null;
                unidadeFuncional['qj'] = null;
                unidadeFuncional['qk'] = null;
                unidadeFuncional['destino'] = null;
                unidadeFuncional['posicao'] = null;

                this.unidadesFuncionais[nome] = unidadeFuncional;
            }
        }
    }
}

class MemoryReservationStation {
    unidadesFuncionaisMemoria = {};
    constructor(CONFIG) {
        for (var tipoUnidade in CONFIG['unidadesMem']) {
            for (let i = 0; i < CONFIG['unidadesMem'][tipoUnidade]; i++) {
                let unidadeFuncionalMemoria = {};
                unidadeFuncionalMemoria['instrucao'] = null;
                unidadeFuncionalMemoria['estadoInstrucao'] = null;
                unidadeFuncionalMemoria['tipoUnidade'] = tipoUnidade;
                unidadeFuncionalMemoria['tempo'] = null;

                let nome = tipoUnidade + (i + 1);
                unidadeFuncionalMemoria['nome'] = nome;
                unidadeFuncionalMemoria['ocupado'] = false;
                unidadeFuncionalMemoria['qi'] = null;
                unidadeFuncionalMemoria['qj'] = null;

                unidadeFuncionalMemoria['operacao'] = null;
                unidadeFuncionalMemoria['endereco'] = null;
                unidadeFuncionalMemoria['destino'] = null;
                unidadeFuncionalMemoria['posicao'] = null;

                this.unidadesFuncionaisMemoria[nome] =
                    unidadeFuncionalMemoria;
            }
        }
    }
}

let clock = 0
let flagDesvio = false

let estacaoRegistradores = {};

for (let i = 0; i < 11; i += 1) {
    estacaoRegistradores['F' + i] = null;
}

for (let i = 0; i < 11; i += 1) {
    estacaoRegistradores['R' + i] = null;
}

function getNovaInstrucao() {
    for (let i = 0; i < reorderBuffer.estadoInstrucoes.length; i++) {
        const element = reorderBuffer.estadoInstrucoes[i];
        if (element.issue == null) return element;
    }
    return undefined;
}

function verificaUFInstrucao(instrucao) {
    switch (instrucao.operacao) {
        case 'ADD':
            return 'Add';
        case 'SUB':
            return 'Add';
        case 'MUL':
            return 'Mult';
        case 'DIV':
            return 'Mult';
        case 'LD':
            return 'Load';
        case 'SW':
            return 'Store';
        case 'ADDI':
            return 'Add';
        case 'BEQ':
            return 'Desvio';
        case 'BNE':
            return 'Desvio';
    }
}

function getUFVazia(tipoUF) {
    if (tipoUF === 'Load' || tipoUF === 'Store') {
        for (let key in memoryReservationStation.unidadesFuncionaisMemoria) {
            var ufMem = memoryReservationStation.unidadesFuncionaisMemoria[key];

            if (ufMem.tipoUnidade === tipoUF) {
                if (!ufMem.ocupado) {
                    return ufMem;
                }
            }
        }
        return undefined;
    }
    for (let key in reservationStation.unidadesFuncionais) {
        var uf = reservationStation.unidadesFuncionais[key];

        if (uf.tipoUnidade === tipoUF) {
            if (!uf.ocupado) {
                return uf;
            }
        }
    }
    return undefined;
}

function getCiclos(instrucao) {
    switch (instrucao.operacao) {
        case 'ADD':
            return parseInt(config.ciclos['Add']);
        case 'SUB':
            return parseInt(config.ciclos['Add']);
        case 'MUL':
            return parseInt(config.ciclos['Mult']);
        case 'DIV':
            return parseInt(config.ciclos['Div']);
        case 'LD':
            return parseInt(config.ciclos['Load']);
        case 'SW':
            return parseInt(config.ciclos['Store']);
        case 'ADDI':
            return parseInt(config.ciclos['Add']);
        case 'BEQ':
            return parseInt(config.ciclos['Desvio']);
        case 'BNE':
            return parseInt(config.ciclos['Desvio']);
    }
}

function alocaUfMem(uf, instrucao, estadoInstrucao) {
    uf.instrucao = instrucao;
    uf.estadoInstrucao = estadoInstrucao;
    uf.tempo = getCiclos(instrucao) + 1;
    uf.ocupado = true;
    uf.operacao = instrucao.operacao;
    uf.endereco = instrucao.registradorS + '+' + instrucao.registradorT;
    uf.destino = instrucao.registradorR;
    uf.posicao = estadoInstrucao.posicao;
    uf.qi = null;
    uf.qj = null;

    if (instrucao.operacao === 'SW') {
        let UFQueTemQueEsperar =
            estacaoRegistradores[instrucao.registradorR];

        if (
            UFQueTemQueEsperar in reservationStation.unidadesFuncionais ||
            UFQueTemQueEsperar in memoryReservationStation.unidadesFuncionaisMemoria
        )
            uf.qi = UFQueTemQueEsperar;
        else uf.qi = null;
    }

    let UFintQueTemQueEsperar =
        estacaoRegistradores[instrucao.registradorT];

    if (
        UFintQueTemQueEsperar in reservationStation.unidadesFuncionais ||
        UFintQueTemQueEsperar in memoryReservationStation.unidadesFuncionaisMemoria
    )
        uf.qj = UFintQueTemQueEsperar;
    else uf.qj = null;
}

function escreveEstacaoRegistrador(instrucao, ufNome) {
    estacaoRegistradores[instrucao.registradorR] = ufNome;
}

function alocaUF(uf, instrucao, estadoInstrucao) {
    uf.instrucao = instrucao;
    uf.estadoInstrucao = estadoInstrucao;
    uf.tempo = getCiclos(instrucao) + 1;
    uf.ocupado = true;
    uf.operacao = instrucao.operacao;
    uf.destino = instrucao.registradorR;
    uf.posicao = estadoInstrucao.posicao;

    let reg_j;
    let reg_k;
    let reg_j_inst;
    let reg_k_inst;

    if (instrucao.operacao === 'BNE' || instrucao.operacao === 'BEQ') {
        reg_j = estacaoRegistradores[instrucao.registradorR];
        reg_k = estacaoRegistradores[instrucao.registradorS];

        reg_j_inst = instrucao.registradorR;
        reg_k_inst = instrucao.registradorS;
    } else {
        reg_j = estacaoRegistradores[instrucao.registradorS];
        reg_k = estacaoRegistradores[instrucao.registradorT];

        reg_j_inst = instrucao.registradorS;
        reg_k_inst = instrucao.registradorT;
    }


    if (reg_j === null || reg_j === undefined) uf.vj = reg_j_inst;
    else {
        if (
            reg_j in reservationStation.unidadesFuncionais ||
            reg_j in memoryReservationStation.unidadesFuncionaisMemoria
        )
            uf.qj = reg_j;
        else uf.vj = reg_j;
    }

    if (reg_k === null || reg_k === undefined) uf.vk = reg_k_inst;
    else {
        if (
            reg_k in reservationStation.unidadesFuncionais ||
            reg_k in memoryReservationStation.unidadesFuncionaisMemoria
        )
            uf.qk = reg_k;
        else uf.vk = reg_k;
    }
}

function liberaUFEsperandoResultado(UF) {

    for (let keyUF in reservationStation.unidadesFuncionais) {
        const ufOlhando = reservationStation.unidadesFuncionais[keyUF];

        if (
            ufOlhando.ocupado === true &&
            (ufOlhando.qj === UF.nome || ufOlhando.qk === UF.nome)
        ) {
            if (ufOlhando.qj === UF.nome) {
                ufOlhando.vj = 'VAL(' + UF.nome + ')';
                ufOlhando.qj = null;
            }

            if (ufOlhando.qk === UF.nome) {
                ufOlhando.vk = 'VAL(' + UF.nome + ')';
                ufOlhando.qk = null;
            }

            if (ufOlhando.qj === null && ufOlhando.qk === null) {
                ufOlhando.tempo = ufOlhando.tempo - 1;
            }
        }
    }

    for (let keyUF in memoryReservationStation.unidadesFuncionaisMemoria) {
        const ufOlhando = memoryReservationStation.unidadesFuncionaisMemoria[keyUF];

        if (ufOlhando.ocupado === true) {
            if (ufOlhando.qi === UF.nome) {
                ufOlhando.qi = null;
                ufOlhando.tempo = ufOlhando.tempo - 1;
            } else if (ufOlhando.qj === UF.nome) {
                ufOlhando.qj = null;
                ufOlhando.tempo = ufOlhando.tempo - 1;
            }
        }
    }
}

function desalocaUFMem(ufMem) {
    ufMem.instrucao = null;
    ufMem.estadoInstrucao = null;
    ufMem.tempo = null;
    ufMem.ocupado = false;
    ufMem.operacao = null;
    ufMem.endereco = null;
    ufMem.destino = null;
    ufMem.posicao = null;
    ufMem.qi = null;
    ufMem.qj = null;
}

function desalocaUF(uf) {
    uf.instrucao = null;
    uf.estadoInstrucao = null;
    uf.tempo = null;
    uf.ocupado = false;
    uf.operacao = null;
    uf.destino = null;
    uf.posicao = null;
    uf.vj = null;
    uf.vk = null;
    uf.qj = null;
    uf.qk = null;
}

function verificaSeJaTerminou() {
    let qtdInstrucaoNaoTerminada = 0;
    for (let i = 0; i < reorderBuffer.estadoInstrucoes.length; i++) {
        const element = reorderBuffer.estadoInstrucoes[i];

        if (element.write === null) qtdInstrucaoNaoTerminada++;
    }

    return qtdInstrucaoNaoTerminada > 0 ? false : true;
}

function issueNovaInstrucao() {

    let novaInstrucao = getNovaInstrucao();

    if (novaInstrucao) {
        let ufInstrucao = verificaUFInstrucao(
            novaInstrucao.instrucao
        );
        let UFParaUsar = getUFVazia(ufInstrucao);
        console.log(JSON.stringify(UFParaUsar))
        if (UFParaUsar) {
            if (
                UFParaUsar.tipoUnidade == 'Load' ||
                UFParaUsar.tipoUnidade == 'Store'
            )
                alocaUfMem(
                    UFParaUsar,
                    novaInstrucao.instrucao,
                    novaInstrucao
                );
            else
                alocaUF(
                    UFParaUsar,
                    novaInstrucao.instrucao,
                    novaInstrucao
                );

            novaInstrucao.issue = clock;

            if (
                UFParaUsar.tipoUnidade !== 'Store' &&
                UFParaUsar.operacao !== 'BEQ' &&
                UFParaUsar.operacao !== 'BEQ'
            )
                escreveEstacaoRegistrador(
                    novaInstrucao.instrucao,
                    UFParaUsar.nome
                );
        }
    }
}

function executaInstrucao() {
    for (let key in memoryReservationStation.unidadesFuncionaisMemoria) {
        var ufMem = memoryReservationStation.unidadesFuncionaisMemoria[key];

        if (
            ufMem.ocupado === true &&
            ufMem.qi === null &&
            ufMem.qj === null
        ) {
            ufMem.tempo = ufMem.tempo - 1;
            console.log('estado Instrucao', ufMem.estadoInstrucao);

            if (ufMem.tempo === 0) {
                ufMem.estadoInstrucao.exeCompleta = clock;
                ufMem.estadoInstrucao.busy = false;
            }
        }
    }

    for (let key in reservationStation.unidadesFuncionais) {
        var uf = reservationStation.unidadesFuncionais[key];

        if (uf.ocupado === true && uf.vj !== null && uf.vk !== null) {
            uf.tempo = uf.tempo - 1;
            uf.estadoInstrucao.busy = true;

            if (uf.tempo === 0) {
                uf.estadoInstrucao.exeCompleta = clock;
                uf.estadoInstrucao.busy = false;
            }
        }
    }
}

function escreveInstrucao() {
    for (let key in memoryReservationStation.unidadesFuncionaisMemoria) {
        const ufMem = memoryReservationStation.unidadesFuncionaisMemoria[key];

        if (ufMem.ocupado === true) {
            if (ufMem.tempo === -1) {
                ufMem.estadoInstrucao.write = clock;

                let valorReg =
                    estacaoRegistradores[
                    ufMem.instrucao.registradorR
                    ];

                if (valorReg === ufMem.nome) {
                    estacaoRegistradores[
                        ufMem.instrucao.registradorR
                    ] = 'VAL(' + ufMem.nome + ')';
                }

                liberaUFEsperandoResultado(ufMem);
                desalocaUFMem(ufMem);
            }
        }
    }

    for (let key in reservationStation.unidadesFuncionais) {
        const uf = reservationStation.unidadesFuncionais[key];

        if (uf.ocupado === true) {
            if (uf.tempo === -1) {
                uf.estadoInstrucao.write = clock;

                let valorReg =
                    estacaoRegistradores[
                    uf.instrucao.registradorR
                    ];

                if (valorReg === uf.nome) {
                    estacaoRegistradores[
                        uf.instrucao.registradorR
                    ] = 'VAL(' + uf.nome + ')';
                }

                liberaUFEsperandoResultado(uf);
                desalocaUF(uf);
            }
        }
    }
}

function verificaDesvio() { 
    const instDesvio = reorderBuffer.estadoInstrucoes.map((objeto, index) => ({ ...objeto, index })).filter(item => item.instrucao.operacao === 'BEQ')[0]
    console.log("instDesvio", instDesvio)
    if(instDesvio.exeCompleta) { // se a instrução estiver completa
        let verificaSeTodasAcimaEscreveram = true;
        for(let i = 0; i < instDesvio.index; i++) {
            if(reorderBuffer.estadoInstrucoes[i].write === null) 
                verificaSeTodasAcimaEscreveram = false
        } 
        if(!verificaSeTodasAcimaEscreveram) return null
        
        const j = reorderBuffer.estadoInstrucoes.length
        const instrucoesALimpar = []
        for(let i = instDesvio.index + 1; i < j; i++) {
            if(reorderBuffer.estadoInstrucoes[i].issue != null)
                instrucoesALimpar.push(reorderBuffer.estadoInstrucoes[i])
        }
        const instrucoesALimparFormatadas = instrucoesALimpar.map(item => `${item.instrucao.operacao}${item.instrucao.registradorR}${item.instrucao.registradorS}${item.instrucao.registradorT}`)
        console.log("INSTS", instrucoesALimparFormatadas)

        for(let key in reservationStation.unidadesFuncionais) {
            const item = reservationStation.unidadesFuncionais[key]
            if(!item.instrucao) continue
            if(instrucoesALimparFormatadas.includes(`${item.instrucao.operacao}${item.instrucao.registradorR}${item.instrucao.registradorS}${item.instrucao.registradorT}`))
                item.instrucao = null
                item.estadoInstrucao = null
                item.ocupado = false
                item.tempo = null
                item.operacao = null
                item.vj = null
                item.vk = null
                item.qj = null
                item.qk = null
                item.destino = null
                item.posicao = null
        }

        for(let key in memoryReservationStation.unidadesFuncionaisMemoria) {
            const item = memoryReservationStation.unidadesFuncionaisMemoria[key]
            if(!item.instrucao) continue
            if(instrucoesALimparFormatadas.includes(`${item.instrucao.operacao}${item.instrucao.registradorR}${item.instrucao.registradorS}${item.instrucao.registradorT}`))
                item.instrucao = null
                item.estadoInstrucao = null
                item.ocupado = false
                item.qi = null
                item.qj = null
                item.endereco = null
                item.destino = null
                item.posicao = null
        }
        reorderBuffer.estadoInstrucoes.splice(instDesvio.index + 1, j - instDesvio.index);
        reorderBuffer.estadoInstrucoes[instDesvio.index].write = clock
    }
}

export function executa_ciclo() {

    clock++;

    issueNovaInstrucao();
    executaInstrucao();
    escreveInstrucao();

    flagDesvio && verificaDesvio();

    console.log('Estado instrução:');
    console.log(JSON.stringify(reorderBuffer.estadoInstrucoes, null, 2));

    console.log('\nUnidades Funcionais memória:');
    console.log(JSON.stringify(memoryReservationStation.unidadesFuncionaisMemoria, null, 2));

    console.log('\nUnidades Funcionais:');
    console.log(JSON.stringify(reservationStation.unidadesFuncionais, null, 2));

    console.log('Estado registradores:');
    console.log(JSON.stringify(estacaoRegistradores, null, 2));

    return verificaSeJaTerminou();
}

const config = new Config()

const reorderBuffer = new ReorderBuffer(config.numInstrucoes)

const reservationStation = new ReservationStation(config)

const memoryReservationStation = new MemoryReservationStation(config)

// executa_ciclo()
// executa_ciclo()
// executa_ciclo()
// executa_ciclo()
// executa_ciclo()
// executa_ciclo()
// executa_ciclo()
// executa_ciclo()
// executa_ciclo()

function returnState(instruction) {
    if(instruction.write) {
        return "Commit";
    } else if(instruction.exeCompleta) {
        return "Write Result"
    } else if(instruction.issue) {
        return "Execute"
    } else {
        return "Issue"
    }
}

function getBusyInstruction(instruction) {
    if(instruction.write) {
        return false;
    } else if(instruction.exeCompleta) {
        return true
    } else if(instruction.issue) {
        return true
    } else {
        return false
    }
}

function attTableReorderBuffer() {
    // Obtenha a referência à lista ul
    const myList = document.getElementById('reorder-buffer');
    myList.innerHTML = '<li>' + 
    '<p>Entry</p>' +
    '<p>Busy</p>' + 
    '<p>Instruction</p>' + 
    '<p>State</p>' +
    '<p>Destination</p>' +
    '</li>';
    const listReorderBuffer = [];
    console.log("reorderBuffer.estadoInstrucoes", reorderBuffer.estadoInstrucoes)

    // Dados dos itens a serem adicionados
    reorderBuffer.estadoInstrucoes.forEach((item, index) => {
        console.log("item.busy", item.busy)
        listReorderBuffer.push({
            number: index,
            titles: [
                getBusyInstruction(item) ? '✔️' : '❌',
                `${item.instrucao.operacao} ${item.instrucao.registradorR} ${item.instrucao.registradorS} ${item.instrucao.registradorT}`,
                returnState(item),
                item.instrucao.registradorR,
            ]
        })
    })

    // Iterar sobre os dados e adicionar os itens à lista
    listReorderBuffer.forEach(itemData => {
        const listItem = createListItem(itemData.number, itemData.titles);
        myList.appendChild(listItem);
    });
}

function attTableReservationStations() {
    // Obtenha a referência à lista ul
    const myList = document.getElementById('reservation-stations');
    myList.innerHTML = '<li>' + 
    '<p>Name</p>' +
    '<p>Busy</p>' + 
    '<p>Op</p>' + 
    '<p>Vj</p>' +
    '<p>Vk</p>' +
    '<p>Qj</p>' +
    '<p>Qk</p>' +
    '<p>A (Endereço)</p>' +
    '<p>Dest</p>' +
    '</li>';
    const reservationStationsNames = ["Add1", "Add2", "Add3", "Desvio1", "Desvio2", "Mult1", "Mult2", "Load1", "Load2", "Store1", "Store2", "Store3"];

    // Dados dos itens a serem adicionados
    const listReservationsStations = [];

    reservationStationsNames.forEach((item, index) => {
        if(item.includes("Store") || item.includes("Load")) {
            listReservationsStations.push({
                number: index,
                titles: [
                    memoryReservationStation.unidadesFuncionaisMemoria[item].nome,
                    memoryReservationStation.unidadesFuncionaisMemoria[item].ocupado ? '✔️' : '❌',
                    memoryReservationStation.unidadesFuncionaisMemoria[item].operacao,
                    memoryReservationStation.unidadesFuncionaisMemoria[item].vj,
                    memoryReservationStation.unidadesFuncionaisMemoria[item].vk,
                    memoryReservationStation.unidadesFuncionaisMemoria[item].qj,
                    memoryReservationStation.unidadesFuncionaisMemoria[item].qk,
                    memoryReservationStation.unidadesFuncionaisMemoria[item].endereco,
                    memoryReservationStation.unidadesFuncionaisMemoria[item].posicao != null ? `#${memoryReservationStation.unidadesFuncionaisMemoria[item].posicao}` : ""
                ]
            })
        } else {
            listReservationsStations.push({
                number: index,
                titles: [
                     reservationStation.unidadesFuncionais[item].nome,
                     reservationStation.unidadesFuncionais[item].ocupado ? '✔️' : '❌' ,
                     reservationStation.unidadesFuncionais[item].operacao,
                     reservationStation.unidadesFuncionais[item].vj,
                     reservationStation.unidadesFuncionais[item].vk,
                     reservationStation.unidadesFuncionais[item].qj,
                     reservationStation.unidadesFuncionais[item].qk,
                     reservationStation.unidadesFuncionais[item].endereco,
                     reservationStation.unidadesFuncionais[item].posicao != null ? `#${reservationStation.unidadesFuncionais[item].posicao}` : ""
                ]
            })
        }
    })
    // Iterar sobre os dados e adicionar os itens à lista
    listReservationsStations.forEach(itemData => {
        const listItem = createListItem(itemData.number, itemData.titles, false);
        myList.appendChild(listItem);
    });

}

function attTableFPRegisterStatus() {
    // Obtenha a referência à lista ul
    const myList = document.getElementById('fp-register-stations');
    myList.innerHTML = '<li>' + 
    '<p>Field</p>' +
    '<p>R0</p>' + 
    '<p>R1</p>' + 
    '<p>R2</p>' +
    '<p>R3</p>' +
    '<p>R4</p>' +
    '<p>R5</p>' +
    '<p>R6</p>' +
    '<p>R7</p>' +
    '<p>R8</p>' +
    '<p>R9</p>' +
    '<p>R10</p>' +
    '</li>';
    const listReorder = ["", "", "", "", "", "", "", "", "", "", ""];
    const listBusy = ["❌", "❌", "❌", "❌", "❌", "❌", "❌", "❌", "❌", "❌", "❌"];
    const listFPRegisterStatus = [];
    console.log('estacaoRegistradores', estacaoRegistradores)

    // Dados dos itens a serem adicionados
    
    // listFPRegisterStatus.push({
    //     titles: [
    //         'Qi',
    //         estacaoRegistradores["F0"],
    //         estacaoRegistradores["F1"],
    //         estacaoRegistradores["F2"],
    //         estacaoRegistradores["F3"],
    //         estacaoRegistradores["F4"],
    //         estacaoRegistradores["F5"],
    //         estacaoRegistradores["F6"],
    //         estacaoRegistradores["F7"],
    //         estacaoRegistradores["F8"],
    //         estacaoRegistradores["F9"],
    //         estacaoRegistradores["F10"],
    //     ]
    // })

     

    for(let i in reorderBuffer.estadoInstrucoes) {
        const inst = reorderBuffer.estadoInstrucoes[i];
        console.log('inst', inst)
        if(inst['issue'] != null) {
            console.log("inst['instrucao'].registradorR", inst['write'])
            listReorder[Number(inst['instrucao'].registradorR.substring(1))] = inst['write'] ? '' : `${i}`
            listBusy[Number(inst['instrucao'].registradorR.substring(1))] = inst['write'] ? '❌' : '✔️'
        }
    }

    listFPRegisterStatus.push({
        titles: [
            'Reorder#',
            ...listReorder
        ]
    })
    listFPRegisterStatus.push( {
        titles: [
            "Busy",
            ...listBusy
        ] 
    })

    // Iterar sobre os dados e adicionar os itens à lista
    listFPRegisterStatus.forEach(itemData => {
        const listItem = createListItem(itemData.number, itemData.titles, false);
        myList.appendChild(listItem);
    });
}

function attClock() {
    const clockElement = document.getElementById("clock-text");
    clockElement.innerHTML = `Clock: ${clock}`
}

export function attTables() {
    attTableReorderBuffer()
    attTableReservationStations()
    attTableFPRegisterStatus()
    attClock()
}

// Função auxiliar para criar um item da lista com base nos dados fornecidos
function createListItem(number, titles, showIndex = true) {
    // Cria o elemento <li>
    const listItem = document.createElement('li');

    // Cria os elementos <p> e atribui o conteúdo
    titles.forEach(title => {
        const p = document.createElement('p');
        p.textContent = title;
        listItem.appendChild(p);
    });

    // Cria o elemento <p> para o número
    if(showIndex) {
        const pNumber = document.createElement('p');
        pNumber.textContent = number;
        listItem.insertBefore(pNumber, listItem.firstChild);
    }

    return listItem;
}

export function toogleFlag() {
    flagDesvio = !flagDesvio
}
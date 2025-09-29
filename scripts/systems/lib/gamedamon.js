// gamedamon.js
import { world, system } from "@minecraft/server";
import { mainPlayers, setupSpectatorList } from "./notjoins.js";
import { redistributeItems, giveOwnerConfigUI, distributeJoinSpectatorItems } from "../JoinE.js";
import { isHost, getHostId } from "./getowuner.js";
import { setupBoard, stopBoard } from "./board.js";
import { CONFIG_KEY } from "./config.js";
import { doFirstTP } from "./firsttp.js";

// === グローバル管理用変数 ===
export let startedGame = false;        // ゲームが開始されているかどうか
export const joinedPlayers = new Map(); // 参加プレイヤー (id → player)

// === スクリプトイベント受信 ===
export function startgameinthedeathswapsurvivalminigame(){
    system.run(() => {
        if (startedGame) {
            world.sendMessage("§eゲームはすでに開始されています。");
            return;
        }
        startGame();
    });
}

// === ゲーム開始処理 ===
function startGame() {
    system.run(() => {
    joinedPlayers.clear();
    startedGame = true;
    world.getDimension("overworld").runCommand("clear @a")
    world.sendMessage("§3現在、このアドオンはアルファ版です。効果音などは無く、予期せぬ動作が起こるかもしれません。");
    world.sendMessage("§eゲームが開始されました");

    // 全プレイヤーを取得
    const players = world.getPlayers();
    world.getDimension("overworld").runCommand("gamerule falldamage false");

    for (const player of players) {
        if (player.hasTag("entry")) {
            // 参加プレイヤーとして登録
            joinedPlayers.set(player.id, player);

            // 念のため spec タグ削除
            if (player.hasTag("spec")) {
                player.removeTag("spec");
            }
            player.sendMessage("§aあなたはゲームに参加しました!");
        } else {
            // entry タグがない → 強制観戦者
            if (!player.hasTag("spec")) {
                player.addTag("spec");
            }
            player.sendMessage("§7観戦者として登録されました。");
        }
    }
    
    world.sendMessage(`§e参加人数: ${joinedPlayers.size}人`);
    doFirstTP(joinedPlayers);
    setupBoard();
    setupSpectatorList();
    system.runTimeout(() => {
        world.getDimension("overworld").runCommand("playsound mob.enderdragon.growl @a");
        world.getDimension("overworld").runCommand("title @a title Death-Swap Start");
    },100);
    system.runTimeout(() => {
        world.getDimension("overworld").runCommand("gamerule falldamage true")
        world.sendMessage("落下ダメージが有効になりました");
    }, 200);
    });
}
export function ingorestopgame(){
    world.beforeEvents.chatSend.subscribe((ev) => {
        const player = ev.sender;
        const msg = ev.message.trim();

        if (msg === "!dsstop") {
            system.run(() => {
            ev.cancel = true;

            if (isHost(player.id)) {
                player.sendMessage("§c[Death_Swap] あなたはオーナーではないため実行できません。");
                return;
            }

            if (!startedGame) {
                player.sendMessage("§e[Death_Swap] ゲームは開始されていません。");
                return;
            }

            // 緊急停止処理
            startedGame = false;
            joinedPlayers.clear();
            mainPlayers.length = 0;

            redistributeItems();
            world.sendMessage("§c[Death_Swap] ゲームが緊急停止されました。");
            stopBoard();
        });
        }

        if (msg === "!D_Creset") {
            ev.cancel = true;

            if (isHost(player.id)) {
                player.sendMessage("§c[Death_Swap] あなたはオーナーではないため実行できません。");
                return;
            }

            world.setDynamicProperty(CONFIG_KEY, JSON.stringify({}));

            world.sendMessage("§c[Debug-System] clear config");
        }

        if (msg === "!D_startA") {
            ev.cancel = true;

            if (isHost(player.id)) {
                player.sendMessage("§c[Death_Swap] あなたはオーナーではないため実行できません。");
                return;
            }

            setupBoard();
            world.sendMessage("§c[Debug-System] Start script of the action bar");
        }

        if (msg === "!D_stopA") {
            ev.cancel = true;

            if (isHost(player.id)) {
                player.sendMessage("§c[Death_Swap] あなたはオーナーではないため実行できません。");
                return;
            }

            stopBoard();
            world.sendMessage("§c[Debug-System] Stop script of the action bar");
        }

        if (msg === "!D_Mstart") {
            system.run(() => {
            ev.cancel = true;

            if (isHost(player.id)) {
                player.sendMessage("§c[Death_Swap] あなたはオーナーではないため実行できません。");
                return;
            }
            joinedPlayers.clear();
            joinedPlayers.set(player.id, player);
            world.getDimension("overworld").runCommand("clear @a")
            player.sendMessage(`§e参加人数: ${joinedPlayers.size}人`);
            world.getDimension("overworld").runCommand("gamerule falldamage false");
            doFirstTP(joinedPlayers);
            setupBoard();
            if (joinedPlayers.size === 1) { // 勝者トリガー
            system.runTimeout(() => {
                world.getDimension("overworld").runCommand("gamerule falldamage false");
                Endgame();
                world.sendMessage("§c[Debug-System] 疑似スタート＆終了");
             },100);
            }
        });
        }

    })
}
// 
export function Endgame(){ // Endgameのくせにオブジェクトの仕様のせいで別functionが必要になってしまった
    const [winnerId, winnerPlayer] = joinedPlayers.entries().next().value;
    localspecialscriptfk(winnerPlayer);
}
function localspecialscriptfk(winner){
    system.runTimeout(() => {
    world.sendMessage("§b勝者が決定しました");
    world.sendMessage(`§b勝者 §l${winner.nameTag} `);// 勝者を発表する
    world.getDimension("overworld").runCommand("playsound block.end_portal.spawn @a");
    redistributeItems();
    stopBoard();
    },80);
}
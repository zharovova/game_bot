
require('dotenv/config');
const child_process = require('child_process');
const WebSocket = require('ws');
const {
    Message,
    RequestGame,
    GameActions,
    PlayerConnect,
    PlayerChangeHero,
    PlayerChangeColor,
    PlayerPrepared,
} = require('./message.js');

class Game {
    bot_ready = true;

    constructor(websocket_url, user_id, bot_id, game_id) {
        this.process = child_process.fork(`bot.js`);
        if (!game_id) {
            this.game_id = 0;
        } else {
            this.game_id = game_id;
        }
        this.user_id = user_id;
        this.bot_id = bot_id;
        this.lobby_changed = 0;
        this.run(websocket_url, user_id, bot_id, game_id)
    }

    run = async (websocket_url, user_id, bot_id, game_id) => {
        const wss = new WebSocket(websocket_url, null, {
            rejectUnauthorized: false
        });
        let message = new RequestGame(user_id, bot_id, game_id);

        wss.onopen = (e) => {
            console.log(">>> REQUEST GAME");
            message.send_message().then((res) => {
                wss.send(res);
            });
        };

        wss.onmessage = async (event) => {
            let input_msg = await new Message(event.data);

            if (input_msg.game_id === 0 || (this.game_id !== 0
                && this.game_id !== input_msg.game_id)) {
                input_msg.msg_type = 0;
            }

            if (input_msg.msg_type === 24) {
                console.log("IN <<< Lobby changed");
                this.lobby_changed++;
                if (this.lobby_changed > 2) {
                    console.log(">>> GAME READY <<<");
                }
            }

            if (input_msg.msg_type === 12) {
                console.log("IN <<< All players prepared");
                let output_msg = new PlayerReady(this.game_server, this.game_id, this.bot_id);
                console.log("OUT >>> Bot ready");
                output_msg.send_message().then((res) => {
                    wss.send(res)
                })
            }

            if (input_msg.msg_type === 14) {
                console.log("IN <<< All players ready");
            }

            if (input_msg.msg_type === 18) {
                console.log("IN <<< Game parameters");
                this.game_id = input_msg.game_id;
                this.game_server = input_msg.json.ResponseGameParametersArgs.GameServer;
                this.game_parameters = input_msg;
                let player_color = null;
                // Выбор цвета игрока
                let team_players = this.game_parameters.json.ResponseGameParametersArgs.TeamPlayers;

                const botConnect = () => {
                    let output_msg = new PlayerConnect(this.game_server, this.game_id, this.bot_id);
                    console.log("OUT >>> Bot connect");
                    output_msg.send_message().then((res) => {
                        wss.send(res);
                    })
                };
                botConnect();

                // Определение героя бота
                const botChooseHero = () => {
                    const hero_type = this.game_parameters.json.ResponseGameParametersArgs.HeroType;
                    let output_msg = new PlayerChangeHero(this.game_server, this.game_id, this.bot_id, hero_type);
                    console.log("OUT >>> Bot choose hero");
                    output_msg.send_message().then((res) => {
                        wss.send(res)
                    })
                };
                botChooseHero();

                team_players.forEach((team) => {
                    if (team.PlayerId === this.bot_id)
                        player_color = team.PlayerColor;
                })
                if (!player_color) {
                    team_players.forEach((team) => {
                        if (!team.PlayerId)
                            player_color = team.PlayerColor
                    })
                }

                const botPlayerChangeColor = () => {
                    let output_msg = new PlayerChangeColor(this.game_server, this.game_id, this.bot_id, player_color);
                    console.log("OUT >>> Bot choose color");
                    output_msg.send_message().then((res) => {
                        wss.send(res)
                    })
                };
                botPlayerChangeColor();

                // Передача боту параметров игры
                this.game_parameters.json["HeroType"] = hero_type;
                this.game_parameters.json["PlayerColor"] = player_color;
            }

            if (input_msg.msg_type === 10) {
                console.log("IN <<< All players connected");
                let output_msg = new PlayerPrepared(this.game_server, this.game_id, this.bot_id);

                console.log("OUT >>> Bot prepared");
                output_msg.send_message().then((res) => {
                    wss.send(res)
                })

                // Передача боту параметров игры
                this.game_parameters.json["Teams"] = input_msg.json.AllPlayersConnectedArgs.Teams;
                let msg_bytes = this.game_parameters.toString().encode() + '/n';
                this.process.send(msg_bytes);
            }

            if (input_msg.msg_type === 2) {
                console.log("IN <<< Game started");
            }

            if (input_msg.msg_type === 9) {
                console.log("IN <<< Player disconnected");
            }

            if (input_msg.msg_type === 4) {
                const get_command = async () => {
                    await this.process.on("message", (command) => {
                        while (!this.bot_ready) {
                            if (command.trim() === "end") {
                                this.bot_ready = true;
                            } else if (command.trim()) {
                                console.log("OUT >>> Send command: " + command);
                                let msg = new GameActions(this.game_server, this.game_id, JSON.parse(command));
                                msg.send_message().then((res) => {
                                    wss.send(res)
                                })
                            }
                        }
                    });
                }
                if (this.bot_ready) {
                    console.log("IN <<< Game tick: " + input_msg.json.GameStateArgs.Tick.toString());
                    // Если бот готов, отправляем ему стейт
                    this.bot_ready = false;
                    let msg_bytes = escape(JSON.stringify(input_msg.json["GameStateArgs"])) + '\n';
                    this.process.send(msg_bytes);
                    await get_command();
                }
            }

            if (input_msg.msg_type === 5) {
                console.log("IN <<< Game cancel");
                this.process.exit();
            }

            if (input_msg.msg_type === 6) {
                console.log("IN <<< Game over");
                this.process.exit();
            }
        };

        wss.onclose = (e) => {
            console.log('Connection closed');
        };

        wss.onerror = (err) => {
            console.log(err);
        };
    };
};

module.exports = Game;

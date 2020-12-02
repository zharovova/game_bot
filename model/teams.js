
class PLayer {
  /* Класс с необходимой информацией об иргроках */
  constructor(player_color, hero_type) {
    this.player_color = player_color;
    this.hero_type = hero_type
  }
}


class Teams{
/* Класс игровых команд */
  my_team = [];  // массив игроков моей команды
  enemy_team = [];  // массив игроков команд противников

constructor(game) {
  this.teams = game.Teams;
  if (game["HeroType"] === HeroType.Mag.value)
    this.my_her =new Mag(game);
  if (game["HeroType"] === HeroType.Warrior.value)
    this.my_her = new Warrior(game);
  if (game["HeroType"] === HeroType.BlackSmith.value)
    this.my_her = new BlackSmith(game);
 let my_team_id = this.__get_team_id(this.my_her.player_color)
  for (let team in game.Teams) {
    for (let player in team.Players) {
      if (team.TeamId === my_team_id)
        this.my_team = [...this.my_team,new PLayer(player["PlayerColor"], player["HeroType"])]
      else
        this.enemy_team = [... this.enemy_team, new PLayer(player["PlayerColor"], player["HeroType"])];
    }
  }
}
my_team_players_color = () =>
{
  /*Возвращает массив цветов игроков команды моего бота */
  let result = [];
  for (let player in this.my_team)
  result = [...result,player.player_color]
  return result;
}

enemy_players_have_hero = (hero_type) =>
{
  /* Возвращает True если в команде противника найден тип героя hero_type */
  for (let player in this.enemy_team)
  if (player.hero_type === hero_type)
  return player;
}

get_team_colors_by_color = (player_color) => {
  /* Возвращает массив игроков команды игрока player_color */
  let team_id = this.__get_team_id(player_color);
  let result = []
  for (let team in this.teams) {
    for (let player in team["Players"])
      if (team["TeamId"] === team_id)
        result = [...result,player["PlayerColor"]]
    return result;
  }
}

  __get_team_id = ( player_color) => {
    /* Возвращает идентификатор команды бота игрока player_color */
    for (let team in this.teams)
      for (let player in team["Players"])
        if (player["PlayerColor"] === player_color)
          return team["TeamId"]
  }
}
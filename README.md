# stealth devs bot.

this bot was developed for the [stealth developers][group] discord server, it's core functionality is allowing users
to report bugs. 

## development 

### setup

first, make sure that you have the [bun] javascript runtime installed, then you can clone this repository and install the
dependencies.

```sh
git clone git@codeberg.org:autumnnn/sd_bot.git ./sd_bot
cd ./sd_bot/

bun i[nstall]
```

sd bot uses bun's [built-in sqlite module][sqlite] to store things like bug reports and user data. you'll need to create
a `database.sqlite` file in the root directory of the repository.

```sh
touch database.sqlite
```

### configuration

todo.

### running the bot

to run the bot, simply run the `bun start` command in the root directory of the repository.

```sh
bun start
```

if you want to run the bot in development mode, you can use the `bun dev` command, this will automatically restart the
bot when you make changes to the source code.

```sh
bun dev
```


## issues 

if you encounter any issues with the bot, please open an issue on the codeberg repository. alternatively, you can
message me on [discord] if you're in the stealth developers server.

## license 

this project is licensed under the copyleft GNU Affero General Public License v3.0. you can find a copy of the license 
in [./COPYING].

all files in this repository are licensed under the same GNU Affero General Public License v3.0 unless explicitly stated
otherwise.


### 

[group]: https://www.roblox.com/groups/12266404/Stealth-Developers#!/about
[bun]: https://bun.sh/
[sqlite]: https://bun.sh/docs/api/sqlite
[./COPYING]: ./COPYING
[discord]: https://discord.com/users/729567972070391848

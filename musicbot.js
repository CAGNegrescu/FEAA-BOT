	const botsettings= require("./musicbotsetting.json");

	const { Client, Util } = require("discord.js");
	const ytdl=require("ytdl-core");
	const Youtube=require("simple-youtube-api");
	const prefix=botsettings.prefix;
	const token=botsettings.token;

	const client = new Client({disableEveryone: true});
	const youtube= new Youtube("AIzaSyA6pnz2j0_iMzfY6uuM7H5FuqDkzVqYQhk");

	const queue=new Map();
	//client.on("ready", () => console.log("Active"));
	client.on("ready",async ()=> {
		console.log(`Bot is ready! ${client.user.username}`);

		try{
			let link = await client.generateInvite(["ADMINISTRATOR"]);
			console.log(link);

		} catch(e){
			console.log(e.stack);
		}
	});

	client.on("message", async message=>{
		if(message.author.bot) return;
		if(!message.content.startsWith(prefix)) return;

		const args = message.content.substring(prefix.length).split(" ");
		const searchString= args.slice(1).join(' ');
		const url=args[1] ? args[1].replace(/<(._)>/g, '$1') : ''
		const serverQueue=queue.get(message.guild.id);

	 	if(message.content.startsWith(`${prefix}play`)){
			const voiceChannel=message.member.voice.channel;
			let VoiceChannel= message.guild.channels.cache.find(channel=>channel.name === "Music");
			console.log(url);
			console.log(args[1]);

			if(!voiceChannel) return message.channel.send("Trebuie sa fii intr-un voice channel pentru a asculta muzica");
			const permission=voiceChannel.permissionsFor(message.client.user);
			if(!permission.has("CONNECT")) return message.channel.send("Nu am permisiunea de a ma conecta la voice channel");
			if(!permission.has("SPEAK")) return message.channel.send("Nu am permisiunea de vorbi in voice channel ");
			
			if(url.match( /^.*(youtu.be\/|list=)([^#\&\?]*).*/)){
				const playlist=await youtube.getPlaylist(url)
				const videos = await playlist.getVideos()
				for(const video of Object.values(videos)){
					const video2 = await youtube.getVideoByID(video.id)
					await handleVideo(video2,message,VoiceChannel,true)
				}
			} else {
				try {
				var video= await youtube.getVideoByID(url)
			} catch{
				try{
					var videos=await youtube.searchVideos(searchString,1)
					var video= await youtube.getVideoByID(videos[0].id);
				}catch {
					return message.channel.send("Nu am gasit niciun rezultat");

				}
			}
			return handleVideo(video,message,voiceChannel)
			}
			

			
			

			
		} else if (message.content.startsWith(`${prefix}stop`)){
			if(!message.member.voice.channel) return message.channel.send("Trebuie sa fii intr-un voice channel pentru a opri muzica.");
			if(!serverQueue) return message.channel.send("Playlist gol. Nu am ce sa opresc..");
			serverQueue.songs=[];
			serverQueue.connection.dispatcher.end();
			message.channel.send("Am oprit muzica pentru tine. Semn ca tin la tine!")
			return undefined;
		} else if(message.content.startsWith(`${prefix}skip`)){
			if(!message.member.voice.channel) return message.channel.send("Trebuie sa fii intr-un voice channel pentru a trece la urmatoarea piesa.");
			if(!serverQueue) return message.channel.send("Playlist gol.");
			serverQueue.connection.dispatcher.end();
			message.channel.send("Am schimbat melodia pentru tine!");
			return undefined;
		} else if(message.content.startsWith(`${prefix}volume`)) {
			if(!message.member.voice.channel) return message.channel.send("Trebuie sa fii intrun voice channel");
			if(!serverQueue) return message.channel.send("Playlistul e gol");
			if(!args[1]) return message.channel.send(`Volum curent: ${serverQueue.volume}`);
			if(isNaN(args[1])) return message.channel.send("Numarul selectat este invalid. Trebuie sa fie intre 0 si 5");
			serverQueue.volume= args[1]
			serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1]/5)
			message.channel.send(`Am schimbat volumul la: ${args[1]}`);
			return undefined;
		}else if (message.content.startsWith(`${prefix}np`)) {
			if(!serverQueue) return message.channel.send("Playlistul e gol");
			message.channel.send(`Ruleaza acum: ${serverQueue.songs[0].title}`);
			return undefined;
		}else if (message.content.startsWith(`${prefix}queue`)){
			if(!serverQueue) return message.channel.send("Playlistul e gol");
			message.channel.send(`
				Playlist:\n${serverQueue.songs.map(song=>`${song.title}`).join('\n')}

Ruleaza Acum:\n${serverQueue.songs[0].title}
				`, {split:true})
			return undefined
		} else if(message.content.startsWith(`${prefix}pause`)){
			if(!message.member.voice.channel) return message.channel.send("Trebuie sa fii intr-un voice channel");
			if(!serverQueue) return message.channel.send("Playlistul e gol");
			if(!serverQueue.playing) return message.channel.send("Melodia este deja intrerupta");
			serverQueue.playing= false;
			serverQueue.connection.dispatcher.pause();
			message.channel.send("Am pus pauza");
			return undefined;

		}else if(message.content.startsWith(`${prefix}resume`)){
			if(!message.member.voice.channel) return message.channel.send("Trebuie sa fii intr-un voice channel");
			if(!serverQueue) return message.channel.send("Playlistul e gol");

			if(serverQueue.playing) return message.channel.send("Muzica nu a fost intrerupta");
			serverQueue.playing= true;
			serverQueue.connection.dispatcher.resume();
			message.channel.send("Am pornit muzica");
			return undefined;
		}
		return undefined;
		



	});
	async function handleVideo(video,message,VoiceChannel,playlist=false){
		const serverQueue=queue.get(message.guild.id);

		const song ={
				id: video.id,
				title: video.title,
				url: `https://www.youtube.com/watch?v=${video.id}`
			};

			if(!serverQueue){
				const queueConstruct={
					textChannel: message.channel,
					voiceChannel: VoiceChannel,
					connection: null,
					songs:[],
					volume:5,
					playing: true
				};
				queue.set(message.guild.id,queueConstruct);

				queueConstruct.songs.push(song);

				try{

				var connection= await VoiceChannel.join()
				queueConstruct.connection=connection;
				play(message.guild,queueConstruct.songs[0],message);

				}catch(error) {
				console.log(`A aparut o eroare de conexiune la voice chanel: ${error}`);
				queue.delete(message.guild.id);
				return message.channel.send(`A aparut o eroare la connectare la voice channel: ${error}`);		
				}
			} else {
				serverQueue.songs.push(song);
				if(playlist) return undefined;
				else return message.channel.send(`Melodia: ${song.title} a fost adaugat in playlist`);				
			}
			return undefined;
	}
	function play(guild,song,message){
		const serverQueue=queue.get(guild.id)
		if (!song) {
			serverQueue.voiceChannel.leave();
			message.channel.send("Nu mai e nimic de ascultat");
			queue.delete(guild.id);
			return;
		}	

		try{
				const dispatcher = serverQueue.connection.play (ytdl(song.url))
				.on("finish",()=>{
					serverQueue.songs.shift();
					play(guild,serverQueue.songs[0],message); 
				})
				.on("error", error=>{
					console.log(error);
					message.channel.send("S-ar putea ca linkul sa nu fie unul valid.")
				});
				dispatcher.setVolumeLogarithmic(serverQueue.volume/5);

				serverQueue.textChannel.send(`Ruleaza acum: ${song.title}`);
			}catch(e)
			{
				console.log(e.stack);
				serverQueue.voiceChannel.leave();
				return message.channel.send("Vai de mine eroare la video!");

			}
	}
	client.login(botsettings.token);
import { App, type Command } from '#core/app';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	data: new SlashCommandBuilder().setDescription('Displays the current websocket ping to Discord'),
	async run(ctx) {
		return await App.respond(ctx, `📶\u2002${ctx.command.client.ws.ping} ms`);
	},
};

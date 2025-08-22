import {
	chunkEmbeds,
	createResponse,
	isChatInput,
	isComponent,
	sanitizeEmbeds,
} from '#utils/discord';
import { getFilePaths } from '#utils/helpers';
import {
	ActivityType,
	type AnySelectMenuInteraction,
	AutocompleteInteraction,
	type BaseMessageOptions,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	Collection,
	GatewayIntentBits,
	Guild,
	GuildMember,
	InteractionResponse,
	Message,
	type SlashCommandOptionsOnlyBuilder,
	type SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import path, { basename } from 'path';
import { pathToFileURL } from 'url';

type Response = Message | InteractionResponse;

export type ResponseType = 'DEFAULT' | 'CHANNEL' | 'REPLY' | 'APP_ERROR' | 'USER_ERROR';

interface BaseCommandContext {
	command: AutocompleteInteraction | ChatInputCommandInteraction | Message;
	args: string[];
	guild: Guild;
	member: GuildMember;
}

export interface AutocompleteInteractionContext extends BaseCommandContext {
	command: AutocompleteInteraction;
}

export interface ChatInputCommandInteractionContext extends BaseCommandContext {
	command: ChatInputCommandInteraction;
}

export interface MessageCommandContext extends BaseCommandContext {
	command: Message;
}

export interface ResponseContext {
	command:
		| ChatInputCommandInteractionContext['command']
		| MessageCommandContext['command']
		| AnySelectMenuInteraction;
}

export interface Command {
	aliases?: string[];
	help?: string;
	data: SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
	autocomplete?: (context: AutocompleteInteractionContext) => Promise<void>;
	run: (context: ChatInputCommandInteractionContext | MessageCommandContext) => Promise<Response>;
}

class AppClient extends Client {
	public readonly commands = new Collection<string, Command>();
	public async initCommands(): Promise<void> {
		const filePaths = await getFilePaths('./src/commands/', '.ts');

		const modules = await Promise.all(
			filePaths.map(async (filePath) => {
				try {
					const module = await import(pathToFileURL(path.resolve(filePath)).href);

					return { filePath, module, ok: true as const };
				} catch (error) {
					console.error(`Failed to load command from ${filePath}:`, error);

					return { filePath, module: null, ok: false as const };
				}
			})
		);

		for (const { filePath, module, ok } of modules) {
			if (!ok) continue;

			const { command } = module as { command: Command };

			if (!command?.data || !command?.run) {
				console.warn(`[commands] Skipped ${filePath}: missing 'command.data' or 'command.run'`);
				continue;
			}

			const commandName =
				command.data.name || command.data.setName(basename(filePath, '.ts').toLowerCase()).name;

			if (this.commands.has(commandName)) {
				console.warn(`[commands] Duplicate command name "${commandName}" in ${filePath}`);

				continue;
			}

			this.commands.set(commandName, command);
		}

		console.log('Commands initialized');
	}
	public async initEvents(): Promise<void> {
		const filePaths = await getFilePaths('./src/events/', '.ts');

		await Promise.all(
			filePaths.map((filePath) => {
				try {
					import(pathToFileURL(path.resolve(filePath)).href);
				} catch (error) {
					console.error(`[events] Failed to load event from ${filePath}:`, error);
				}
			})
		);

		console.log('Events registered');
	}
	public async respond(
		context: ResponseContext,
		message: string | BaseMessageOptions,
		type: ResponseType = 'DEFAULT'
	): Promise<Response> {
		const cmd = context.command;
		const firstPayload: BaseMessageOptions = createResponse(context, message, type);
		let firstResponse: Response;

		if (type === 'CHANNEL' && cmd.channel?.type === ChannelType.GuildText)
			firstResponse = await cmd.channel.send(firstPayload);
		else if (isChatInput(cmd))
			firstResponse =
				cmd.deferred || cmd.replied ? await cmd.editReply(firstPayload) : await cmd.reply(firstPayload);
		else if (isComponent(cmd))
			firstResponse =
				cmd.deferred || cmd.replied ? await cmd.followUp(firstPayload) : await cmd.update(firstPayload);
		else if (type === 'REPLY') firstResponse = await cmd.reply(firstPayload);
		else if (cmd.channel?.type === ChannelType.GuildText)
			firstResponse = await cmd.channel.send(firstPayload);
		else firstResponse = await cmd.reply(firstPayload);

		if (typeof message === 'string') return firstResponse;

		const pages = message.embeds?.length ? chunkEmbeds(sanitizeEmbeds(Array.from(message.embeds))) : [];

		if (pages.length > 1) {
			for (let i = 1; i < pages.length; i++) {
				const followPayload = createResponse(context, { ...message, embeds: pages[i] ?? [] });

				if (isChatInput(cmd) || isComponent(cmd)) {
					await cmd.followUp(followPayload);
				} else if (cmd.channel?.type === ChannelType.GuildText) {
					await cmd.channel.send(followPayload);
				} else {
					await cmd.reply(followPayload);
				}
			}
		}

		return firstResponse;
	}
}

export const App = new AppClient({
	intents: [
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
	],
	presence: {
		activities: [
			{
				name: `🚀 | ${process.env.PREFIX ?? 'herb'}help | v${
					process.env.npm_package_version ?? '--.--.--'
				}`,
				type: ActivityType.Custom,
			},
		],
	},
});

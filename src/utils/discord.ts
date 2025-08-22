import type { ResponseContext, ResponseType } from '#core/app';
import { truncate } from '#utils/helpers';
import {
	type BaseMessageOptions,
	ChatInputCommandInteraction,
	EmbedBuilder,
	type Interaction,
	type InteractionReplyOptions,
	Message,
	MessageComponentInteraction,
	MessageFlags,
} from 'discord.js';

export const EMBED_LIMITS = {
	TITLE: 256,
	DESCRIPTION: 4096,
	FIELDS: 25,
	FIELD_NAME: 256,
	FIELD_VALUE: 1024,
	FOOTER: 2048,
	AUTHOR: 256,
	EMBEDS_PER_MESSAGE: 10,
	TOTAL_EMBEDS: 25,
};

export function sanitizeEmbeds(
	embeds: BaseMessageOptions['embeds'] | EmbedBuilder[]
): EmbedBuilder[] {
	if (!embeds || embeds.length === 0) return [];

	const builders = embeds?.map((embed) =>
		embed instanceof EmbedBuilder ? embed : EmbedBuilder.from(embed)
	);

	for (const builder of builders) {
		const json = builder.toJSON();

		if (json.title) builder.setTitle(truncate(json.title, EMBED_LIMITS.TITLE));
		if (json.description) builder.setDescription(truncate(json.description, EMBED_LIMITS.DESCRIPTION));
		if (json.fields?.length) {
			const trimmed = json.fields.slice(0, EMBED_LIMITS.FIELDS).map((field) => ({
				name: truncate(field.name, EMBED_LIMITS.FIELD_NAME),
				value: truncate(field.value, EMBED_LIMITS.FIELD_VALUE),
				inline: field.inline ?? false,
			}));

			builder.setFields(trimmed);
		}
		if (json.footer?.text)
			builder.setFooter({ ...json.footer, text: truncate(json.footer.text, EMBED_LIMITS.FOOTER) });
		if (json.author?.name)
			builder.setAuthor({ ...json.author, name: truncate(json.author.name, EMBED_LIMITS.AUTHOR) });
	}

	return builders;
}

export function chunkEmbeds<T>(embeds: T[], size = EMBED_LIMITS.EMBEDS_PER_MESSAGE): T[][] {
	const out: T[][] = [];

	for (let i = 0; i < embeds.length; i += size) {
		out.push(embeds.slice(i, i + size));
	}

	return out;
}

export function createResponse<T extends ResponseContext>(
	context: T,
	message: string | BaseMessageOptions,
	type: ResponseType = 'DEFAULT'
): T['command'] extends ChatInputCommandInteraction ? InteractionReplyOptions : BaseMessageOptions {
	const cmd = context.command;
	let payload: InteractionReplyOptions | BaseMessageOptions;

	if (typeof message === 'string') {
		const embed = new EmbedBuilder();

		switch (type) {
			case 'APP_ERROR':
				embed.setColor('Orange').setDescription(`⚠️\u2002**${message}**`);
				break;
			case 'USER_ERROR':
				embed.setColor('Red').setDescription(`❌\u2002**${message}**`);
				break;
			default:
				embed.setColor(cmd.guild?.members.me?.displayHexColor ?? null).setDescription(`**${message}**`);
				break;
		}

		const embeds = sanitizeEmbeds([embed]);
		payload =
			isInteraction(cmd) && (type === 'APP_ERROR' || type === 'USER_ERROR')
				? { embeds, flags: MessageFlags.Ephemeral }
				: { embeds };
	} else {
		const sanitized = sanitizeEmbeds(message.embeds ?? []);
		const firstPage = sanitized.slice(0, EMBED_LIMITS.EMBEDS_PER_MESSAGE);
		payload =
			isInteraction(cmd) && (type === 'APP_ERROR' || type === 'USER_ERROR')
				? {
						...message,
						embeds: firstPage,
						flags: MessageFlags.Ephemeral,
				  }
				: {
						...message,
						embeds: firstPage,
				  };
	}

	return payload;
}

export function isMessage(cmd: object): cmd is Message {
	return cmd && typeof cmd === 'object' && 'id' in cmd && 'author' in cmd && 'content' in cmd;
}

export function isInteraction(cmd: object): cmd is Interaction {
	return cmd && typeof (cmd as any).isRepliable === 'function';
}

export function isChatInput(cmd: object): cmd is ChatInputCommandInteraction {
	return isInteraction(cmd) && cmd.isChatInputCommand?.() === true;
}

export function isComponent(cmd: object): cmd is MessageComponentInteraction {
	return isInteraction(cmd) && cmd.isMessageComponent?.() === true;
}

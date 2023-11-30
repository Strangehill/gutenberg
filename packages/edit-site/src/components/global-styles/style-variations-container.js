/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useMemo, useContext, useState } from '@wordpress/element';
import { ENTER } from '@wordpress/keycodes';
import {
	__experimentalGrid as Grid,
	ToggleControl,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { privateApis as blockEditorPrivateApis } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import { mergeBaseAndUserConfigs } from './global-styles-provider';
import StylesPreview from './preview';
import { unlock } from '../../lock-unlock';

const { GlobalStylesContext, areGlobalStyleConfigsEqual } = unlock(
	blockEditorPrivateApis
);

function Variation( { variation, preserveAdditionalCSS } ) {
	const [ isFocused, setIsFocused ] = useState( false );
	const { base, user, setUserConfig } = useContext( GlobalStylesContext );
	const context = useMemo( () => {
		return {
			user: {
				settings: variation.settings ?? {},
				styles: variation.styles ?? {},
			},
			base,
			merged: mergeBaseAndUserConfigs( base, variation ),
			setUserConfig: () => {},
		};
	}, [ variation, base ] );

	const selectVariation = () => {
		const blockStyles = { ...variation?.styles?.blocks } || {};
		if ( user?.styles?.blocks && preserveAdditionalCSS ) {
			Object.keys( user.styles.blocks ).forEach( ( blockName ) => {
				if ( user.styles.blocks[ blockName ].css ) {
					blockStyles[ blockName ] = {
						...( blockStyles[ blockName ]
							? blockStyles[ blockName ]
							: {} ),
						css: user.styles.blocks[ blockName ].css,
					};
				}
			} );
		}
		const styles = preserveAdditionalCSS
			? {
					...variation.styles,
					...( user?.styles?.css ? { css: user.styles.css } : {} ),
					blocks: {
						...blockStyles,
					},
			  }
			: variation.styles;

		setUserConfig( () => {
			return {
				settings: variation.settings,
				styles,
			};
		} );
	};

	const selectOnEnter = ( event ) => {
		if ( event.keyCode === ENTER ) {
			event.preventDefault();
			selectVariation();
		}
	};

	const isActive = useMemo( () => {
		return areGlobalStyleConfigsEqual( user, variation );
	}, [ user, variation ] );

	let label = variation?.title;
	if ( variation?.description ) {
		label = sprintf(
			/* translators: %1$s: variation title. %2$s variation description. */
			__( '%1$s (%2$s)' ),
			variation?.title,
			variation?.description
		);
	}

	return (
		<GlobalStylesContext.Provider value={ context }>
			<div
				className={ classnames(
					'edit-site-global-styles-variations_item',
					{
						'is-active': isActive,
					}
				) }
				role="button"
				onClick={ selectVariation }
				onKeyDown={ selectOnEnter }
				tabIndex="0"
				aria-label={ label }
				aria-current={ isActive }
				onFocus={ () => setIsFocused( true ) }
				onBlur={ () => setIsFocused( false ) }
			>
				<div className="edit-site-global-styles-variations_item-preview">
					<StylesPreview
						label={ variation?.title }
						isFocused={ isFocused }
						withHoverView
					/>
				</div>
			</div>
		</GlobalStylesContext.Provider>
	);
}

export default function StyleVariationsContainer() {
	const [ preserveAdditionalCSS, setPreserveAdditionalCSS ] =
		useState( true );

	const variations = useSelect( ( select ) => {
		return select(
			coreStore
		).__experimentalGetCurrentThemeGlobalStylesVariations();
	}, [] );

	const withEmptyVariation = useMemo( () => {
		return [
			{
				title: __( 'Default' ),
				settings: {},
				styles: {},
			},
			...( variations ?? [] ).map( ( variation ) => ( {
				...variation,
				settings: variation.settings ?? {},
				styles: variation.styles ?? {},
			} ) ),
		];
	}, [ variations ] );

	return (
		<>
			<Grid
				columns={ 2 }
				className="edit-site-global-styles-style-variations-container"
			>
				{ withEmptyVariation.map( ( variation, index ) => (
					<Variation
						key={ index }
						variation={ variation }
						preserveAdditionalCSS={ preserveAdditionalCSS }
					/>
				) ) }
			</Grid>

			<ToggleControl
				className="edit-site-global-styles-style-variations-preserve-css"
				label={ __( 'Keep additional CSS' ) }
				help={ __(
					'Preserve additional CSS when switching between variations.'
				) }
				checked={ preserveAdditionalCSS }
				onChange={ () => {
					setPreserveAdditionalCSS(
						preserveAdditionalCSS ? false : true
					);
				} }
			/>
		</>
	);
}

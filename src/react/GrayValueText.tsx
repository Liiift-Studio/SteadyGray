// steadyGray/src/react/GrayValueText.tsx — React component wrapper
import React, { forwardRef, useCallback } from 'react'
import { useGrayValue } from './useGrayValue'
import type { GrayValueOptions } from '../core/types'

interface GrayValueTextProps extends GrayValueOptions {
	children: React.ReactNode
	className?: string
	style?: React.CSSProperties
	as?: React.ElementType
}

/**
 * Drop-in component that applies the gray-value effect to its children.
 */
export const GrayValueText = forwardRef<HTMLElement, GrayValueTextProps>(
	function GrayValueText({ children, className, style, as: Tag = 'p', ...options }, forwardedRef) {
		const innerRef = useGrayValue(options)

		// Merge the hook's internal ref with the forwarded ref so both are satisfied.
		const mergedRef = useCallback(
			(node: HTMLElement | null) => {
				;(innerRef as React.MutableRefObject<HTMLElement | null>).current = node
				if (typeof forwardedRef === 'function') {
					forwardedRef(node)
				} else if (forwardedRef) {
					forwardedRef.current = node
				}
			},
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[innerRef, forwardedRef],
		)

		return (
			<Tag ref={mergedRef as React.Ref<HTMLElement>} className={className} style={style}>
				{children}
			</Tag>
		)
	},
)

GrayValueText.displayName = 'GrayValueText'

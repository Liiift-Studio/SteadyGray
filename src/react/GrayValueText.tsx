// gray-value/src/react/GrayValueText.tsx — React component wrapper
import React, { forwardRef } from 'react'
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
	function GrayValueText({ children, className, style, as: Tag = 'p', ...options }, _ref) {
		const innerRef = useGrayValue(options)
		return (
			<Tag ref={innerRef as React.Ref<HTMLElement>} className={className} style={style}>
				{children}
			</Tag>
		)
	},
)

GrayValueText.displayName = 'GrayValueText'

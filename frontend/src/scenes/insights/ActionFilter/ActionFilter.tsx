import './ActionFilter.scss'
import React, { useEffect } from 'react'
import { BindLogic, useActions, useValues } from 'kea'
import { entityFilterLogic, toFilters, LocalFilter } from './entityFilterLogic'
import { ActionFilterRow, MathAvailability } from './ActionFilterRow/ActionFilterRow'
import { Button } from 'antd'
import { PlusCircleOutlined } from '@ant-design/icons'
import {
    ActionFilter as ActionFilterType,
    FilterType,
    FunnelStepRangeEntityFilter,
    InsightType,
    Optional,
} from '~/types'
import { SortableContainer, SortableActionFilterRow } from './Sortable'
import { TaxonomicFilterGroupType } from 'lib/components/TaxonomicFilter/types'
import { RenameModal } from 'scenes/insights/ActionFilter/RenameModal'
import { eventUsageLogic } from 'lib/utils/eventUsageLogic'
import { teamLogic } from '../../teamLogic'
import { ButtonType } from 'antd/lib/button'
import clsx from 'clsx'

export interface ActionFilterProps {
    setFilters: (filters: FilterType) => void
    filters: Optional<FilterType, 'type'>
    typeKey: string
    addFilterDefaultOptions?: Record<string, any>
    mathAvailability?: MathAvailability
    hidePropertySelector?: boolean
    /** Text copy for the action button to add more events/actions (graph series) */
    buttonCopy: string
    buttonType?: ButtonType
    /** Whether the full control is enabled or not */
    disabled?: boolean
    /** Whether actions/events can be sorted (used mainly for funnel step reordering) */
    sortable?: boolean
    /** Whether to show an indicator identifying each graph */
    showSeriesIndicator?: boolean
    /** Series badge shows A, B, C | 1, 2, 3 */
    seriesIndicatorType?: 'alpha' | 'numeric'
    /** Whether to show the "OR" label after each filter */
    showOr?: boolean
    /** Hide local filtering (currently used for retention insight) */
    hideFilter?: boolean
    /** Hides the rename option */
    hideRename?: boolean
    /** A limit of entities (series or funnel steps) beyond which more can't be added */
    entitiesLimit?: number
    /** Custom prefix element to show in each ActionFilterRow */
    customRowPrefix?:
        | string
        | JSX.Element
        | ((props: {
              filter: ActionFilterType | FunnelStepRangeEntityFilter
              index: number
              onClose: () => void
          }) => JSX.Element)
    /** Custom suffix element to show in each ActionFilterRow */
    customRowSuffix?:
        | string
        | JSX.Element
        | ((props: {
              filter: ActionFilterType | FunnelStepRangeEntityFilter
              index: number
              onClose: () => void
          }) => JSX.Element)
    rowClassName?: string
    propertyFilterWrapperClassName?: string
    stripeActionRow?: boolean
    /** Custom actions to be added next to the add series button */
    customActions?: JSX.Element
    horizontalUI?: boolean
    fullWidth?: boolean
    /** Show nested arrows to the left of property filter buttons */
    showNestedArrow?: boolean
    /** Which tabs to show for actions selector */
    actionsTaxonomicGroupTypes?: TaxonomicFilterGroupType[]
    /** Which tabs to show for property filters */
    propertiesTaxonomicGroupTypes?: TaxonomicFilterGroupType[]
    hideDeleteBtn?: boolean
    readOnly?: boolean
    renderRow?: ({
        seriesIndicator,
        prefix,
        filter,
        suffix,
        propertyFiltersButton,
        deleteButton,
        orLabel,
    }: Record<string, JSX.Element | string | undefined>) => JSX.Element
}

export const ActionFilter = React.forwardRef<HTMLDivElement, ActionFilterProps>(
    (
        {
            setFilters,
            filters,
            typeKey,
            addFilterDefaultOptions = {},
            mathAvailability = MathAvailability.All,
            hidePropertySelector = false,
            buttonCopy = '',
            disabled = false,
            sortable = false,
            showSeriesIndicator = false,
            seriesIndicatorType = 'alpha',
            showOr = false,
            hideFilter = false,
            hideRename = false,
            horizontalUI = false,
            fullWidth = false,
            customRowPrefix,
            customRowSuffix,
            rowClassName,
            entitiesLimit,
            propertyFilterWrapperClassName,
            stripeActionRow = true,
            customActions,
            showNestedArrow = false,
            actionsTaxonomicGroupTypes,
            propertiesTaxonomicGroupTypes,
            hideDeleteBtn,
            renderRow,
            buttonType = 'dashed',
            readOnly = false,
        },
        ref
    ): JSX.Element => {
        const { currentTeamId } = useValues(teamLogic)
        const logic = entityFilterLogic({
            teamId: currentTeamId,
            setFilters,
            filters,
            typeKey,
            addFilterDefaultOptions,
        })
        const { reportFunnelStepReordered } = useActions(eventUsageLogic)

        const { localFilters } = useValues(logic)
        const { addFilter, setLocalFilters, showModal } = useActions(logic)

        // No way around this. Somehow the ordering of the logic calling each other causes stale "localFilters"
        // to be shown on the /funnels page, even if we try to use a selector with props to hydrate it
        useEffect(() => {
            setLocalFilters(filters)
        }, [filters])

        function onSortEnd({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }): void {
            function move(arr: LocalFilter[], from: number, to: number): LocalFilter[] {
                const clone = [...arr]
                Array.prototype.splice.call(clone, to, 0, Array.prototype.splice.call(clone, from, 1)[0])
                return clone.map((child, order) => ({ ...child, order }))
            }
            setFilters(toFilters(move(localFilters, oldIndex, newIndex)))
            if (oldIndex !== newIndex) {
                reportFunnelStepReordered()
            }
        }

        const singleFilter = entitiesLimit === 1

        const commonProps = {
            logic: logic as any,
            showSeriesIndicator,
            seriesIndicatorType,
            mathAvailability,
            hidePropertySelector,
            customRowPrefix,
            customRowSuffix,
            rowClassName,
            propertyFilterWrapperClassName,
            stripeActionRow,
            hasBreakdown: !!filters.breakdown,
            fullWidth,
            actionsTaxonomicGroupTypes,
            propertiesTaxonomicGroupTypes,
            hideDeleteBtn,
            disabled,
            readOnly,
            renderRow,
            hideRename,
            onRenameClick: showModal,
        }

        const reachedLimit: boolean = Boolean(entitiesLimit && localFilters.length >= entitiesLimit)

        return (
            <div ref={ref}>
                {!hideRename && !readOnly && (
                    <BindLogic
                        logic={entityFilterLogic}
                        props={{ setFilters, filters, typeKey, addFilterDefaultOptions }}
                    >
                        <RenameModal view={filters.insight} typeKey={typeKey} />
                    </BindLogic>
                )}
                {localFilters ? (
                    sortable ? (
                        <SortableContainer onSortEnd={onSortEnd} lockAxis="y" distance={5}>
                            {localFilters.map((filter, index) => (
                                <SortableActionFilterRow
                                    key={index}
                                    filter={filter as ActionFilterType}
                                    index={index}
                                    filterIndex={index}
                                    filterCount={localFilters.length}
                                    showNestedArrow={showNestedArrow}
                                    {...commonProps}
                                />
                            ))}
                        </SortableContainer>
                    ) : (
                        localFilters.map((filter, index) => (
                            <ActionFilterRow
                                filter={filter as ActionFilterType}
                                index={index}
                                key={index}
                                singleFilter={singleFilter}
                                showOr={showOr}
                                hideFilter={hideFilter || readOnly}
                                horizontalUI={horizontalUI}
                                filterCount={localFilters.length}
                                showNestedArrow={showNestedArrow}
                                {...commonProps}
                            />
                        ))
                    )
                ) : null}
                {(!singleFilter || customActions) && (
                    <div
                        className={clsx(buttonType !== 'link' ? 'mt' : 'mt-05')}
                        style={{ display: 'flex', alignItems: 'center' }}
                    >
                        {!singleFilter && (
                            <Button
                                type={buttonType}
                                onClick={() => addFilter()}
                                data-attr="add-action-event-button"
                                icon={<PlusCircleOutlined />}
                                disabled={reachedLimit || disabled || readOnly}
                                className="add-action-event-button"
                            >
                                {!reachedLimit
                                    ? buttonCopy || 'Action or event'
                                    : `Reached limit of ${entitiesLimit} ${
                                          filters.insight === InsightType.FUNNELS ? 'steps' : 'series'
                                      }`}
                            </Button>
                        )}
                        {customActions}
                    </div>
                )}
            </div>
        )
    }
)

import { ITimelineDef, IWorldViewDataWithExtra } from '@/src/types/IAiNoval'

export interface ITimelineDateData {
  isBC: boolean
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export class TimelineDateFormatter {
  private readonly epoch: string
  private readonly startSeconds: number
  private readonly hourLengthInSeconds: number
  private readonly dayLengthInHours: number
  private readonly monthLengthInDays: number
  private readonly yearLengthInMonths: number

  public static fromWorldViewWithExtra(worldView: IWorldViewDataWithExtra): TimelineDateFormatter {
    return new TimelineDateFormatter({
      id: worldView.tl_id ?? 0,
      worldview_id: worldView.id ?? 0,
      epoch: worldView.tl_epoch ?? '',
      start_seconds: worldView.tl_start_seconds ?? 0,
      hour_length_in_seconds: worldView.tl_hour_length_in_seconds ?? 3600,
      day_length_in_hours: worldView.tl_day_length_in_hours ?? 24,
      month_length_in_days: worldView.tl_month_length_in_days ?? 30,
      year_length_in_months: worldView.tl_year_length_in_months ?? 365
    })
  }

  constructor(timelineDef: ITimelineDef) {
    this.epoch = timelineDef.epoch
    this.startSeconds = timelineDef.start_seconds
    this.hourLengthInSeconds = timelineDef.hour_length_in_seconds
    this.dayLengthInHours = timelineDef.day_length_in_hours
    this.monthLengthInDays = timelineDef.month_length_in_days
    this.yearLengthInMonths = timelineDef.year_length_in_months
  }

  /**
   * 将秒数转换为结构化的日期数据
   * @param seconds 秒数，负数表示公元前
   * @returns 结构化的日期数据
   */
  secondsToDateData(seconds: number): ITimelineDateData {
    // const absSeconds = Math.abs(seconds)
    const isBC = seconds < 0
    
    // Calculate total seconds in a year
    const secondsInYear = this.yearLengthInMonths * this.monthLengthInDays * this.dayLengthInHours * this.hourLengthInSeconds
    // Calculate total seconds in a month
    const secondsInMonth = this.monthLengthInDays * this.dayLengthInHours * this.hourLengthInSeconds
    // Calculate total seconds in a day
    const secondsInDay = this.dayLengthInHours * this.hourLengthInSeconds

    // Calculate year, month, and day
    const year = Math.floor(seconds / secondsInYear)
    const remainingSeconds = seconds - year * secondsInYear
    const month = Math.floor(remainingSeconds / secondsInMonth) + 1
    const remainingSecondsAfterMonth = remainingSeconds % secondsInMonth
    const day = Math.floor(remainingSecondsAfterMonth / secondsInDay) + 1
    const remainingSecondsAfterDay = remainingSecondsAfterMonth % secondsInDay

    // Calculate hour, minute, second
    const hour = Math.floor(remainingSecondsAfterDay / this.hourLengthInSeconds)
    const remainingSecondsAfterHour = remainingSecondsAfterDay % this.hourLengthInSeconds
    const minute = Math.floor(remainingSecondsAfterHour / 60)
    const second = remainingSecondsAfterHour % 60

    let dateData = {
      isBC,
      year: Math.abs(year) + (isBC ? 0 : 1),
      month,
      day,
      hour,
      minute,
      second
    }

    // console.debug(seconds, ' --> ', dateData)

    return dateData
  }

  /**
   * 将结构化的日期数据转换为秒数
   * @param dateData 结构化的日期数据
   * @returns 对应的秒数，负数表示公元前
   */
  dateDataToSeconds(dateData: ITimelineDateData): number {
    const { isBC, year, month, day, hour, minute, second } = dateData

    // Calculate seconds for a full year
    const secondsInYear = this.yearLengthInMonths * this.monthLengthInDays * this.dayLengthInHours * this.hourLengthInSeconds
    const secondsInMonth = this.monthLengthInDays * this.dayLengthInHours * this.hourLengthInSeconds
    const secondsInDay = this.dayLengthInHours * this.hourLengthInSeconds

    let totalSeconds: number

    if (isBC) {
      // For BC dates: subtract full year seconds and add back remaining time
      totalSeconds = -(year * secondsInYear) + 
                    ((month - 1) * secondsInMonth) +
                    ((day - 1) * secondsInDay) +
                    (hour * this.hourLengthInSeconds) +
                    (minute * 60) +
                    second
    } else {
      // For AD dates: calculate normally
      totalSeconds = ((year - 1) * secondsInYear) + 
                    ((month - 1) * secondsInMonth) +
                    ((day - 1) * secondsInDay) +
                    (hour * this.hourLengthInSeconds) +
                    (minute * 60) +
                    second
    }

    // console.debug(dateData, ' --> ', totalSeconds)

    return totalSeconds
  }

  /**
   * 将秒数转换为年月日格式的字符串
   * @param seconds 秒数，负数表示公元前
   * @returns 格式化后的日期字符串，例如：'公元前100年1月1日' 或 '公元100年1月1日'
   */
  formatSecondsToDate(seconds: number): string {
    const dateData = this.secondsToDateData(seconds)
    // console.debug(dateData);
    return `${dateData.isBC ? '公元前' : '公元'}${dateData.year}年${dateData.month}月${dateData.day}日`
  }

  /**
   * 将日期字符串转换为秒数
   * @param dateStr 日期字符串，支持两种格式：
   *               1. 标准格式：'公元前100年1月1日' 或 '公元100年1月1日'
   *               2. 简化格式：'-100年1月1日' 或 '100年1月1日'
   * @returns 对应的秒数，负数表示公元前
   * @throws Error 当日期格式不正确时抛出错误
   */
  dateToSeconds(dateStr: string): number {
    // 尝试匹配标准格式（公元前/公元）
    const standardRegex = /^(公元前|公元)(\d+)年(\d+)月(\d+)日$/
    const standardMatch = dateStr.match(standardRegex)
    
    // 尝试匹配简化格式（带负号）
    const simpleRegex = /^(-?\d+)年(\d+)月(\d+)日$/
    const simpleMatch = dateStr.match(simpleRegex)

    let year: number
    let month: number
    let day: number
    let isBC: boolean

    if (standardMatch) {
      // 标准格式解析
      const [, era, yearStr, monthStr, dayStr] = standardMatch
      year = parseInt(yearStr, 10)
      month = parseInt(monthStr, 10)
      day = parseInt(dayStr, 10)
      isBC = era === '公元前'
    } else if (simpleMatch) {
      // 简化格式解析
      const [, yearStr, monthStr, dayStr] = simpleMatch
      year = parseInt(yearStr, 10)
      month = parseInt(monthStr, 10)
      day = parseInt(dayStr, 10)
      isBC = year < 0
      year = Math.abs(year)
    } else {
      throw new Error('日期格式不正确，支持以下格式：\n1. 标准格式：公元前/公元 + 年 + 月 + 日，例如：公元前100年1月1日\n2. 简化格式：年 + 月 + 日，例如：-100年1月1日')
    }

    // 验证年月日的有效性
    if (isNaN(year) || year < 1) {
      throw new Error('年份必须为正整数')
    }
    if (isNaN(month) || month < 1 || month > this.yearLengthInMonths) {
      throw new Error(`月份必须在1-${this.yearLengthInMonths}之间`)
    }
    if (isNaN(day) || day < 1 || day > this.monthLengthInDays) {
      throw new Error(`日期必须在1-${this.monthLengthInDays}之间`)
    }

    return this.dateDataToSeconds({ isBC, year, month, day, hour: 0, minute: 0, second: 0 })
  }

  /**
   * 获取时间线的公元点名称
   */
  getEpoch(): string {
    return this.epoch
  }

  /**
   * 获取时间线的起始时间（秒）
   */
  getStartSeconds(): number {
    return this.startSeconds
  }

  /**
   * 获取标准时长度（秒）
   */
  getHourLengthInSeconds(): number {
    return this.hourLengthInSeconds
  }

  /**
   * 获取标准日长度（时）
   */
  getDayLengthInHours(): number {
    return this.dayLengthInHours
  }

  /**
   * 获取标准月长度（天）
   */
  getMonthLengthInDays(): number {
    return this.monthLengthInDays
  }

  /**
   * 获取标准年长度（月）
   */
  getYearLengthInMonths(): number {
    return this.yearLengthInMonths
  }

  /**
   * 判断给定的秒数是否在公元前
   */
  isBC(seconds: number): boolean {
    return seconds < 0
  }

  /**
   * 从秒数获取年份
   */
  getYear(seconds: number): number {
    const dateData = this.secondsToDateData(seconds)
    return dateData.year
  }

  /**
   * 从秒数获取月份
   */
  getMonth(seconds: number): number {
    const dateData = this.secondsToDateData(seconds)
    return dateData.month
  }

  /**
   * 从秒数获取日期
   */
  getDay(seconds: number): number {
    const dateData = this.secondsToDateData(seconds)
    return dateData.day
  }
} 
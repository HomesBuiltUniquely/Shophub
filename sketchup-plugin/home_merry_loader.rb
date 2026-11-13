# frozen_string_literal: true

require 'sketchup.rb'
require 'extensions.rb'

extension = SketchupExtension.new('Home & Merry Shop', 'home_merry/main')
extension.version     = '1.0.0'
extension.creator     = 'Home & Merry'
extension.description = 'Opens the Home & Merry catalog and shop inside SketchUp'

Sketchup.register_extension(extension, true)
